export const getTimeAwareGreeting = (userName?: string): string => {
  const hour = new Date().getHours();
  let greeting = '';
  
  if (hour < 12) {
    greeting = 'Morning';
  } else if (hour < 17) {
    greeting = 'Afternoon';
  } else {
    greeting = 'Evening';
  }
  
  return userName ? `${greeting}, ${userName}` : greeting;
};
