import { toast } from 'sonner-native';

export function showSuccessToast(title: string, message?: string) {
  toast.success(title, {
    description: message,
    duration: 2000,
  });
}

export function showErrorToast(title: string, message?: string) {
  toast.error(title, {
    description: message,
    duration: 3000,
  });
}

export function showInfoToast(title: string, message?: string) {
  toast(title, {
    description: message,
    duration: 2000,
  });
}
