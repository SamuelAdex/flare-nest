import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export const contractAddress = '0x7c6548F5Cb730381270B447480eE53D0dBf53342';


export const serializeAddress = (address: string) => {
  return address?.slice(0, 5) + "..." + address?.slice(38, 44);
}