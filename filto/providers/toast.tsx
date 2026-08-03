import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { Animated, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ToastType = 'success' | 'error' | 'info';

// 取り消しなどの操作ボタン。トーストを逃しても後から復元できる恒久手段は別途用意し、
// これはあくまで即時取り消し用の利便機能。
interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, action?: ToastAction) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('success');
  const [visible, setVisible] = useState(false);
  const [action, setAction] = useState<ToastAction | null>(null);
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? 'light';

  const hideToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -80, duration: 240, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [slideAnim, opacityAnim]);

  const showToast = useCallback(
    (msg: string, toastType: ToastType = 'success', act?: ToastAction) => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setMessage(msg);
      setType(toastType);
      setAction(act ?? null);
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

      // アクション（取り消し等）付きは操作の猶予を長めに取る
      timerRef.current = setTimeout(() => hideToast(), act ? 5000 : 2500);
    },
    [slideAnim, opacityAnim, hideToast]
  );

  const handleActionPress = useCallback(() => {
    const onPress = action?.onPress;
    hideToast();
    onPress?.();
  }, [action, hideToast]);

  const toastColors = {
    light: { success: '#3a6b4f', error: '#b03030', info: '#2c5f8a' },
    dark:  { success: '#4a8a68', error: '#c94040', info: '#3a75a8' },
  };
  const bgColor = toastColors[scheme][type];

  // showToast は安定なので value をメモ化する。これをしないとトースト表示のたびに
  // context 値が変わり、useToast を使う画面全体が再レンダリングされてしまう
  // （記事スワイプ中に発火すると閉じアニメが中断してカクつく原因になっていた）。
  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toast,
            { top: insets.top + 8, backgroundColor: bgColor },
            { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
          ]}
          pointerEvents={action ? 'box-none' : 'none'}
        >
          <View style={styles.row}>
            <Text style={[styles.text, action ? styles.textWithAction : null]}>{message}</Text>
            {action && (
              <TouchableOpacity
                onPress={handleActionPress}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                activeOpacity={0.7}
              >
                <Text style={styles.actionText}>{action.label}</Text>
              </TouchableOpacity>
            )}
          </View>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWithAction: {
    flex: 1,
    textAlign: 'left',
    marginRight: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});
