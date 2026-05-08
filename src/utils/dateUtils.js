export const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const formatDisplayDateTime = (displayDate, currentTime) => {
  const time = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
  }).replace(/\s/g, '');

  const day = displayDate.getDate();
  const month = displayDate.toLocaleString('default', { month: 'long' });

  return `for ${getOrdinal(day)} ${month} (${time})`;
};