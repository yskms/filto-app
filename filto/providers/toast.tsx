import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [visible, setVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';

  const showToast = useCallback(
    (msg: string, toastType: ToastType = 'success') => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setMessage(msg);
      setType(toastType);
      setVisible(true);

      // スライドイン
      slideAnim.setValue(-80);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      // 2.5秒後にスライドアウト
      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: -80,
            duration: 240,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 240,
            useNativeDriver: true,
          }),
        ]).start(() => setVisible(false));
      }, 2500);
    },
    [slideAnim, opacityAnim]
  );

  const toastColors = {
    light: { success: '#3a6b4f', error: '#b03030', info: '#2c5f8a' },
    dark:  { success: '#4a8a68', error: '#c94040', info: '#3a75a8' },
  };
  const bgColor = toastColors[scheme][type];

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toast,
            { top: insets.top + 8, backgroundColor: bgColor },
            { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
