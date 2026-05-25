import '@testing-library/jest-dom';

// Mock pour les icônes React
jest.mock('react-icons', () => ({
  FaHome: () => 'FaHome',
  FaCalendarCheck: () => 'FaCalendarCheck',
  FaCalendarAlt: () => 'FaCalendarAlt',
  FaUsers: () => 'FaUsers',
  FaDownload: () => 'FaDownload',
  FaUser: () => 'FaUser',
  FaSignOutAlt: () => 'FaSignOutAlt',
  FaBars: () => 'FaBars',
  FaCog: () => 'FaCog',
  FaPlus: () => 'FaPlus',
  FaEdit: () => 'FaEdit',
  FaTrash: () => 'FaTrash',
  FaEye: () => 'FaEye',
  FaCheck: () => 'FaCheck',
  FaTimes: () => 'FaTimes',
  FaClock: () => 'FaClock',
  FaFilter: () => 'FaFilter',
  FaChevronLeft: () => 'FaChevronLeft',
  FaChevronRight: () => 'FaChevronRight',
  FaInfoCircle: () => 'FaInfoCircle',
  FaUserCheck: () => 'FaUserCheck',
  FaUserTimes: () => 'FaUserTimes'
}));

// Mock pour Axios
jest.mock('axios', () => ({
  create: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Mock pour React Router
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/' }),
  useParams: () => ({}),
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  Navigate: () => null
}));

// Mock pour localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock pour les variables d'environnement
process.env.VITE_API_URL = 'http://localhost:5500/api';