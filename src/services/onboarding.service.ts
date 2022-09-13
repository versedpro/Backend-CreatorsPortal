import bcrypt from 'bcrypt';
import {
  ChangePasswordRequest,
  GenTokenRequest,
  LoginRequest,
  SignUpRequest,
  SignUpResponse,
  UserAuth
} from '../interfaces/onboarding';
import { db as knex } from '../../data/db';
import { dbTables, JWT_PUBLIC_KEY, sendgrid } from '../constants';
import * as orgService from './organization.service';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { OnboardingType, OrganizationInfo } from '../interfaces/organization';
import { JwtHelper, USER_TOKEN_EXPIRY_IN_SECONDS } from '../helpers/jwt.helper';
import { RoleType } from '../interfaces/jwt.config';
import { KnexHelper } from '../helpers/knex.helper';
import { Logger } from '../helpers/Logger';
import { OrgInviteStatus } from '../interfaces/OrgInvite';
import randomstring from 'randomstring';
import { sendgridMail } from '../helpers/sendgrid.helper';
import * as CacheHelper from '../helpers/cache.helper';

const saltRounds = 10;

async function generateAndSaveToken(req: GenTokenRequest): Promise<string> {
  // generate token; and save in DB.
  const jwtHelper = new JwtHelper({ publicKey: JWT_PUBLIC_KEY });
  const token = await jwtHelper.generateToken({ publicAddress: '', roleType: RoleType.USER, userId: req.user_id, });
  // expires in 21 days
  const expiresAt = Date.now() + (USER_TOKEN_EXPIRY_IN_SECONDS * 1000);
  await knex(dbTables.userTokens).insert({
    organization_id: req.user_id,
    client_id: req.client_id,
    token,
    valid: true,
    expires_at: new Date(expiresAt),
  });
  return token;
}

// cache jwt token status in memory, if not present fetch from db and then cache.
// have a cron job to delete expired token rows.
// tables to create: user_auth, password_reset
export async function signUpUser(request: SignUpRequest): Promise<SignUpResponse> {
  const { invite_code, password } = request;
  const email = request.email.toLowerCase();
  const invite = await orgService.getInvite({ invite_code });
  if (invite.status !== OrgInviteStatus.NOT_SIGNED_UP) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'invalid invite');
  }
  if (invite.email.toLowerCase() !== email.toLowerCase()) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Email does not match invited email');
  }
  // check if email exists in organization
  const existingOrgRes = await knex(dbTables.organizations)
    .select()
    .where({ email: email })
    .limit(1);
  let organization;

  // if so,
  // if type is admin created: go ahead and do auth stuff
  // else return 400.
  // save organization
  if (existingOrgRes.length > 0) {
    Logger.Info('SIGN UP: Organization exists');
    organization = existingOrgRes[0] as OrganizationInfo;
    if (organization.onboarding_type === OnboardingType.INVITED) {
      throw new CustomError(StatusCodes.BAD_REQUEST, 'User already exists');
    }
  } else {
    Logger.Info('SIGN UP: Create New Organization');
    const newOrganization = {
      name: invite.name,
      email: invite.email,
      type: 'BRAND',
      onboarding_type: OnboardingType.INVITED,
    };
    organization = await orgService.addOrganization(newOrganization);
    Logger.Info('SIGN UP: Saved New Organization');
  }
  // hash password
  const passwordHash = await bcrypt.hash(password, saltRounds);
  // save password in auth table
  const authToSave = {
    organization_id: organization.id,
    email: email,
    password: passwordHash,
  };
  await knex(dbTables.organizationAuths).insert(authToSave);
  Logger.Info('SIGN UP: Saved New Auth with Hashed Password');

  const token = await generateAndSaveToken({ user_id: organization.id, client_id: request.client_id });
  Logger.Info('SIGN UP: Generated and saved user token');
  // Expire invite
  await knex(dbTables.organizationInvites).where({ id: invite.id }).update({
    status: OrgInviteStatus.SIGNED_UP,
  });
  Logger.Info('SIGN UP: Changed Invite status to signed up');
  // return org object
  await CacheHelper.set(`jwt_${token}`, true);
  return {
    token,
    user: organization,
  };
}

export async function loginUser(request: LoginRequest): Promise<SignUpResponse> {
  const email = request.email.toLowerCase();
  // hash password
  // find auth by email and hashed_password
  // generate token; and save in DB.
  const emailAuthRes = await knex(dbTables.organizationAuths).select()
    .where({
      email,
    }).limit(1);
  if (emailAuthRes.length === 0) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Invalid login');
  }
  const emailAuth = emailAuthRes[0] as unknown as UserAuth;
  if (!bcrypt.compareSync(request.password, emailAuth.password)) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Invalid login');
  }
  const user = await KnexHelper.getSingleOrganizationInfo({ email });
  if (!user) {
    Logger.Error(`LOGIN ERROR: Organization record not found for email: ${email}`);
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Invalid login');
  }
  const existingValidTokenRes = await knex(dbTables.userTokens).select()
    .where({
      organization_id: user.id,
      client_id: request.client_id,
      valid: true,
    })
    .whereRaw('expires_at > now ()')
    .limit(1);
  if (existingValidTokenRes.length > 0) {
    const existingId = existingValidTokenRes[0].id;
    await knex(dbTables.userTokens)
      .where({ id: existingId })
      .delete();
  }
  const token = await generateAndSaveToken({ user_id: user.id, client_id: request.client_id });
  await CacheHelper.set(`jwt_${token}`, true);
  return {
    token,
    user,
  };
}

export async function forgotPassword(email: string): Promise<boolean> {
  // find auth by email
  const auth = await KnexHelper.getOrganizationAuth({ email });
  if (!auth) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'User with email not found');
  }
  // generate otp
  const otp = randomstring.generate({
    length: 6,
    charset: 'numeric',
  });
  // save password request in table
  await knex(dbTables.passwordResets).where({
    organization_id: auth.organization_id,
  }).delete();

  await knex(dbTables.passwordResets).insert({
    organization_id: auth.organization_id,
    email: email.toLowerCase(),
    otp,
    // expires in 10 minutes
    expires_at: new Date(Date.now() + 600000),
  });
  // send email with OTP
  await sendgridMail.send({
    from: sendgrid.senderEmail,
    to: email,
    templateId: sendgrid.templates.forgotPassword,
    dynamicTemplateData: {
      otp,
    }
  });
  return true;
}

export async function changePassword(request: ChangePasswordRequest): Promise<boolean> {
  const { email, password, otp } = request;
  // find otp in DB
  const otpRes = await knex(dbTables.passwordResets)
    .select()
    .where({
      email: email.toLowerCase(),
      otp,
    })
    .orderBy('created_at', 'desc')
    .limit(1);
  Logger.Info(otpRes[0].expires_at);
  Logger.Info(new Date().getTime(), new Date(otpRes[0].expires_at).getTime());
  if (otpRes.length === 0) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Invalid OTP');
  } else if (new Date().getUTCMilliseconds() > new Date(otpRes[0].expires_at).getUTCMilliseconds()) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'OTP has expired');
  }

  const auth = await KnexHelper.getOrganizationAuth({ email });
  if (!auth) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'User with email not found');
  }

  // hash password
  const passwordHash = await bcrypt.hash(password, saltRounds);
  // save password in auth table
  await knex(dbTables.organizationAuths)
    .where({ id: auth.id })
    .update({ password: passwordHash });

  // delete all previous tokens
  const deletedTokens = await knex(dbTables.userTokens)
    .where({ organization_id: auth.organization_id })
    .delete()
    .returning(['token']);
  Logger.Info('deletedTokens');
  Logger.Info(deletedTokens);
  for (const body of deletedTokens) {
    await CacheHelper.del(`jwt_${body.token}`);
  }
  // update token expiry in cache
  // generate and save new token
  return true;
}
