export function nextIndex(array, index, increment = 1) {
  return (index + increment) % array.length;
}

export function findIndex(array, predicate, start = 0) {
  let current = start;
  do {
    if (predicate(array[current])) {
      return current;
    }
  } while ((current = nextIndex(array, current)) !== start);
  return -1;
}
