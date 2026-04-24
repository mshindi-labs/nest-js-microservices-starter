export const isValidDateString = (dateString: string): boolean => {
  return !isNaN(Date.parse(dateString));
};
