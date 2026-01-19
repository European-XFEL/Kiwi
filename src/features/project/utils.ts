export const getDomains = (hash: any): string[] => {
  const reason = hash.getValue('reason') as string;
  if (reason.length > 0) {
    throw new Error(reason);
  }
  return hash.getValue('reply.domains') as string[];
};
