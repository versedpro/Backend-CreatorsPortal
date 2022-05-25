import { GetOrganizationsRequest } from '../interfaces/organization';
import { KnexHelper } from '../helpers/knex.helper';

const request: GetOrganizationsRequest = {
  page: 1,
  size: 30,
};
const name = 'Luna';
const type = 'BRAND';
const admin_email = 'admin@lunmarket.io';

describe('Test where clause generation', () => {

  it('should generate name clause', async () => {
    const { rawQuery, values } = KnexHelper.generateOrganizationWhereClause({ name, ...request });
    expect(rawQuery).toEqual(' WHERE name ILIKE ?');
    expect(values).toEqual([`${name}%`]);
  });

  it('should generate name and type clause', async () => {
    const { rawQuery, values } = KnexHelper.generateOrganizationWhereClause({ name, type, ...request });
    expect(rawQuery).toEqual(' WHERE name ILIKE ? AND type ILIKE ?');
    expect(values).toEqual([`${name}%`, `${type}%`]);
  });
  it('should generate name clause', async () => {
    const { rawQuery, values } = KnexHelper.generateOrganizationWhereClause({ name, type, admin_email, ...request });
    expect(rawQuery).toEqual(' WHERE name ILIKE ? AND type ILIKE ? AND admin_email ILIKE ?');
    expect(values).toEqual([`${name}%`, `${type}%`, `${admin_email}%`]);
  });
});
