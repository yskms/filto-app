import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  /**
   * 既定は 'default'（fontSize:16 / lineHeight:24）。呼び出し側で fontSize だけを
   * 上書きして lineHeight を上書きし忘れると、既定の24pxが残ったまま合わなくなり、
   * 実機で文字が下(小さいfontSizeなら重なり)/上(大きいfontSizeで拡大された時)に
   * はみ出す（過去にPro画面の価格表示で両方のパターンを実際に踏んだ）。
   * fontSizeを個別指定する箇所は、必ずlineHeightも一緒に指定するか、
   * `lineHeight: undefined` で明示的に打ち消して自然な行高に任せること。
   * 後者はallowFontScaling（既定で全画面有効、無効化しない方針）で拡大された
   * fontSizeにも自動で追従するため、固定px値より安全。
   */
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? [styles.link, { color: tintColor }] : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
  },
});
