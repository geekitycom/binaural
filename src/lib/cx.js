// cx — tiny classnames helper. Joins truthy string args with spaces.
// Accepts strings and falsy values (false/null/undefined) so callers can write
//   cx('vol', driven && 'driven')
export function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}
