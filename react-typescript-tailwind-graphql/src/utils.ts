import { Dispatch, SetStateAction, useState } from "react";

export const useStorage = <S>(
  storage: Storage,
  key: string,
  initialValue?: S
): [S, Dispatch<SetStateAction<S>>] => {
  // State to store our value
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<S>(() => {
    try {
      const storedItem = storage.getItem(key);
      return storedItem ? JSON.parse(storedItem) : initialValue;
    } catch (error) {
      // If error also return initialValue
      console.log(error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that ...
  // ... persists the new value to storage.
  const setValue = (value: S | ((val: S) => S)) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      // A more advanced implementation would handle the error case
      console.log(error);
    }
  };

  return [storedValue, setValue];
};

export const useLocalStorage = <S>(key: string, initialValue?: S) => {
  return useStorage(window.localStorage, key, initialValue);
};
