import axios from 'axios';
import { alertService } from './alertService';
import { toastService } from './toastService';

jest.mock('./alertService', () => ({ alertService: { info: jest.fn() } }));
jest.mock('./toastService', () => ({ toastService: { add: jest.fn() } }));
jest.mock('axios', () => ({ create: jest.fn(() => ({
  interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
})) }));

require('./api');
require('./apiCached');
const clients = axios.create.mock.results.map(result => result.value);

beforeEach(() => {
  alertService.info.mockClear();
  toastService.add.mockClear();
});

test.each([0, 1])('HTTP204 warning is surfaced by actual axios client %s without altering the response', index => {
  const response = {
    status: 204, data: '', config: { url: '/jours-feries/holiday', method: 'delete' },
    headers: { 'x-teamoff-warning': 'HOLIDAY_POST_COMMIT_FAILED' },
  };
  const fulfilled = clients[index].interceptors.response.use.mock.calls[0][0];
  expect(fulfilled(response)).toBe(response);
  expect(alertService.info).toHaveBeenCalledWith(expect.stringContaining('enregistrée'));
  expect(alertService.info).toHaveBeenCalledTimes(1);
  expect(toastService.add).not.toHaveBeenCalled();
  expect(response.status).toBe(204);
  expect(response.data).toBe('');
});

test.each([0, 1])('nominal HTTP204 is not warned by axios client %s', index => {
  const response = { status: 204, data: '', headers: {}, config: { url: '/jours-feries/holiday', method: 'delete' } };
  clients[index].interceptors.response.use.mock.calls[0][0](response);
  expect(alertService.info).not.toHaveBeenCalled();
});

test('import result fields remain untouched and unknown headers never become warnings', () => {
  const fulfilled = clients[0].interceptors.response.use.mock.calls[0][0];
  const data = { imported: 4, total: 5, message: 'Import terminé' };
  const response = { status: 200, data, headers: { 'x-teamoff-warning': 'HOLIDAY_POST_COMMIT_FAILED' },
    config: { url: '/jours-feries/import/2026', method: 'post' } };
  fulfilled(response);
  expect(response.data).toBe(data);
  expect(alertService.info).toHaveBeenCalledTimes(1);
  expect(toastService.add).not.toHaveBeenCalled();
  fulfilled({ ...response, headers: { 'x-teamoff-warning': 'UNKNOWN' } });
  expect(alertService.info).toHaveBeenCalledTimes(1);
});
