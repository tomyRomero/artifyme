import * as yup from 'yup';
import { TITLE_MAX_LENGTH } from '@/lib/title';

// Mirrors the API's rules so mistakes show before anything is sent

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const passwordHint = `Use ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters. A few unrelated words make a strong password that's easy to remember.`;

export const newPassword = yup
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  .required('Password is required');

export const email = yup
  .string()
  .trim()
  .required('Email is required')
  .email('Enter an email address like name@example.com');

export const personName = (label: string) =>
  yup.string().trim().required(`${label} is required`).max(50, `${label} must be at most 50 characters`);

const description = yup
  .string()
  .trim()
  .required('Say what you drew, in a few words')
  .min(3, 'Use at least 3 characters')
  .max(500, 'Use at most 500 characters');

const title = yup
  .string()
  .trim()
  .required('Give it a title')
  .max(TITLE_MAX_LENGTH, `Use at most ${TITLE_MAX_LENGTH} characters`);

export const artworkWords = yup.object({ description, title });
