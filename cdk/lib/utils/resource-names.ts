export const getResourceName = (resourceName = '', env = 'dev'): string => {
  return `CDR-AI-POC-Chatbot${resourceName}${env[0].toUpperCase() + env.slice(1, env.length)}`;
};
