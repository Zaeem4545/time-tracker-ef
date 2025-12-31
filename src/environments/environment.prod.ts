export const environment = {
  production: true,
  // Backend API URL for production (Docker environment)
  // Inside Docker network, backend service is reachable by hostname 'backend'
  // Change this to your actual backend URL if deployed elsewhere
  backendUrl: 'http://backend:3000',
  apiUrl: 'http://backend:3000'
};
