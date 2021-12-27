const _ = {};

_.debug = () => () => {};

_.arrify = t => Array.isArray(t) ? t : typeof t === undefined ? [] : [t];

_.sort = (array, fn, inverse) => {
  array = _.arrify(array);
  if (typeof fn === 'string') {
    if (fn.startsWith('!')) {
      fn = fn.substring(1);
      inverse = true;
    }
    const key = fn;
    fn = x => x[key]
  }
  return array.sort((a, b) => {
    const value = {};
    value.a = fn(a);
    value.b = fn(b);
    if (inverse) {
      [value.a, value.b] = [value.b, value.a];
    }
    if (value.a > value.b) return 1;
    if (value.a < value.b) return -1;
    return 0;
  });
}

_.toFixed = (n, d = 2) => Number(Number(n).toFixed(d));

_.startsWith = (text, searchString) => {
  if (text.startsWith(searchString)) return true;
  if (text.startsWith('\\' + searchString)) return true;
};

export default _;
