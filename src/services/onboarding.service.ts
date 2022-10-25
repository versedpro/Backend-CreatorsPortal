import bcrypt from 'bcrypt';
import {
  ChangePasswordRequest, ConnectWalletRequest,
  GenTokenRequest,
  LoginRequest,
  SignUpRequest,
  SignUpResponse,
  UserAuth, UserWalletAuthRequest
} from '../interfaces/onboarding';
import { db as knex } from '../../data/db';
import { dbTables, FRONTEND_URL, JWT_PUBLIC_KEY, sendgrid } from '../constants';
import * as orgService from './organization.service';
import { CustomError } from '../helpers';
import { StatusCodes } from 'http-status-codes';
import { CreateInviteRequest, OnboardingType, OrganizationInfo } from '../interfaces/organization';
import { JwtHelper, USER_TOKEN_EXPIRY_IN_SECONDS } from '../helpers/jwt.helper';
import { RoleType } from '../interfaces/jwt.config';
import { KnexHelper } from '../helpers/knex.helper';
import { Logger } from '../helpers/Logger';
import { OrgInvite, OrgInviteStatus, OrgInviteType } from '../interfaces/OrgInvite';
import randomstring from 'randomstring';
import { sendgridMail } from '../helpers/sendgrid.helper';
import * as CacheHelper from '../helpers/cache.helper';
import { SignatureVerifier } from '../helpers/signature.verifier';
import * as sigUtil from '@metamask/eth-sig-util';
import { InviteExistsError } from '../interfaces';

const saltRounds = 10;

async function generateAndSaveToken(req: GenTokenRequest): Promise<string> {
  // generate token; and save in DB.
  const jwtHelper = new JwtHelper({ publicKey: JWT_PUBLIC_KEY });
  const token = await jwtHelper.generateToken({
    publicAddress: req.public_address,
    roleType: RoleType.USER,
    userId: req.user_id,
  });
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

async function invalidateOldAndSaveNewToken(body: GenTokenRequest): Promise<string> {
  const { user_id, client_id } = body;
  // delete all previous tokens
  const deletedTokens = await knex(dbTables.userTokens)
    .where({
      organization_id: user_id,
      client_id: client_id,
      valid: true,
    })
    .delete()
    .returning(['token']);
  Logger.Info('deletedTokens');
  Logger.Info(deletedTokens);
  // update token expiry in cache
  for (const body of deletedTokens) {
    await CacheHelper.del(`jwt_${body.token}`);
  }

  const token = await generateAndSaveToken(body);
  await CacheHelper.set(`jwt_${token}`, true);
  return token;
}

export async function addUserInvite(request: CreateInviteRequest): Promise<OrgInvite> {
  request.name = request.name.trim();
  request.email = request.email.trim().toLowerCase();
  request.contact_name = request.contact_name.trim();

  const existingOrg = await KnexHelper.getSingleOrganizationInfo({ email: request.email });
  if (existingOrg) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Organization with email already exists');
  }
  // expires in 30 days
  const existingRes = await KnexHelper.getOrganizationInvite({ email: request.email });
  if (existingRes.length > 0) {
    throw new InviteExistsError();
  }
  const expiresAt = Date.now() + 2592000000;
  const inviteCode = randomstring.generate({
    length: 40,
    charset: 'alphanumeric',
  });

  // Send email invite to organization using Sendgrid
  await sendgridMail.send({
    from: sendgrid.sender,
    to: request.email,
    templateId: sendgrid.templates.orgInvite,
    dynamicTemplateData: {
      name: request.contact_name,
      signup_link: `${FRONTEND_URL}/signup?invite_code=${inviteCode}&email=${request.email}&method=SELF_SIGN_UP`
    }
  });

  const result = await KnexHelper.insertOrganizationInvite({
    name: request.name,
    contact_name: request.contact_name,
    email: request.email,
    expires_at: new Date(expiresAt),
    invite_code: inviteCode,
    invite_type: OrgInviteType.SELF_INVITE,
    email_sent: true,
  });
  return await orgService.getInvite({ id: result[0].id });
}

// cache jwt token status in memory, if not present fetch from db and then cache.
// have a cron job to delete expired token rows.
// tables to create: user_auth, password_reset
export async function signUpUser(request: SignUpRequest): Promise<SignUpResponse> {
  const { invite_code, invite_type, password } = request;
  const email = request.email.toLowerCase();
  const invite = await orgService.getInvite({ invite_code });
  if (invite.status !== OrgInviteStatus.NOT_SIGNED_UP) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'invalid invite');
  }
  if (invite.email.toLowerCase() !== email.toLowerCase()) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Email does not match invited email');
  }
  let { public_address } = request;
  const { signature } = request;
  if (public_address && signature) {
    public_address = public_address.toLowerCase();
    const address = sigUtil.recoverPersonalSignature({
        data: `Luna Creators Portal Signup: ${invite_code}`,
        signature,
      }
    );
    if (address.toLowerCase() !== public_address.toLowerCase()) {
      throw new CustomError(StatusCodes.BAD_REQUEST, 'Signature not valid');
    }
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
    if (organization.onboarding_type === OnboardingType.INVITED || organization.onboarding_type === OnboardingType.SELF_INVITE) {
      throw new CustomError(StatusCodes.BAD_REQUEST, 'User already exists');
    }
  } else {
    Logger.Info('SIGN UP: Create New Organization');
    const newOrganization = {
      name: invite.name,
      email: invite.email,
      type: 'BRAND',
      onboarding_type: invite_type === OrgInviteType.SELF_INVITE ? OnboardingType.SELF_INVITE : OnboardingType.INVITED,
    };
    if (public_address) {
      // @ts-ignore
      newOrganization.public_address = public_address;
    }
    const { id: newOrgId } = await KnexHelper.insertOrganization(newOrganization);
    organization = await KnexHelper.getSingleOrganizationInfo({ id: newOrgId });
    if (!organization) {
      throw new CustomError(StatusCodes.INTERNAL_SERVER_ERROR, 'User not created');
    }
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

  const token = await generateAndSaveToken({ user_id: organization.id, client_id: request.client_id, public_address });
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
  const token = await invalidateOldAndSaveNewToken({
    user_id: user.id,
    client_id: request.client_id,
  });
  return {
    token,
    user,
  };
}

export async function forgotPassword(email: string, isAdminSender = false): Promise<boolean> {
  // find auth by email
  const auth = await KnexHelper.getOrganizationAuth({ email });
  if (!auth) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'User with email not found');
  }
  const organization = await KnexHelper.getSingleOrganizationInfo({ email });
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
  sendgridMail.send({
    from: sendgrid.sender,
    to: email,
    templateId: isAdminSender ? sendgrid.templates.adminCreatedAccount : sendgrid.templates.forgotPassword,
    dynamicTemplateData: {
      name: organization?.contact_name || '',
      verify_code: otp,
      reset_link: `${FRONTEND_URL}/reset?email=${email}`,
      org_name: organization?.name,
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
  } else if (new Date().getTime() > new Date(otpRes[0].expires_at).getTime()) {
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
  // update token expiry in cache
  for (const body of deletedTokens) {
    await CacheHelper.del(`jwt_${body.token}`);
  }
  const organization = await KnexHelper.getSingleOrganizationInfo({ email });

  await sendgridMail.send({
    from: sendgrid.sender,
    to: email,
    templateId: sendgrid.templates.passwordResetSuccessful,
    dynamicTemplateData: {
      name: organization?.contact_name || '',
      reset_password_link: `${FRONTEND_URL}/reset?email=${email}`,
    }
  });

  return true;
}

export async function connectWallet(request: ConnectWalletRequest): Promise<SignUpResponse> {
  Logger.Info(request);
  const { user_id, signature } = request;
  let { public_address } = request;
  public_address = public_address.toLowerCase();
  const user = await KnexHelper.getSingleOrganizationInfo({ id: user_id });
  if (!user) {
    throw new CustomError(StatusCodes.BAD_REQUEST, '');
  }
  if (user.public_address) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'Wallet is already connected');
  }
  await SignatureVerifier.verifySignature({ publicAddress: public_address, signature, user });
  await KnexHelper.updateOrganization(user_id, {
    public_address,
    nonce: Math.floor(Math.random() * 1000000),
  });
  const token = await invalidateOldAndSaveNewToken({
    user_id: user.id,
    client_id: request.client_id,
    public_address,
  });
  return {
    token,
    user,
  };
}

export async function signInWithWallet(request: UserWalletAuthRequest): Promise<SignUpResponse> {
  const { signature } = request;
  let { public_address } = request;
  public_address = public_address.toLowerCase();
  const user = await KnexHelper.getSingleOrganizationInfo({ public_address });
  if (!user) {
    throw new CustomError(StatusCodes.BAD_REQUEST, 'User not found');
  }
  await SignatureVerifier.verifySignature({ publicAddress: public_address, signature, user });
  await KnexHelper.updateOrganization(user.id, {
    nonce: Math.floor(Math.random() * 1000000),
  });
  const token = await invalidateOldAndSaveNewToken({
    user_id: user.id,
    client_id: request.client_id,
    public_address,
  });
  return {
    token,
    user,
  };
}
