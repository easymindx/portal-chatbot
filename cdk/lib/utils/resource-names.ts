export const getResourceName = (resourceName = '', env = 'dev'): string => {
  return `cdr-ai-poc-chatbot${resourceName ? `-${resourceName}` : ''}-${env}`.toLowerCase();
};
