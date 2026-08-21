import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { AD_UNIT_ID } from '@/constants/adConfig';
import { ProService } from '@/services/ProService';
import { onProStatusChange } from '@/services/purchases';
import { canShowAds } from '@/services/adInit';

/**
 * ホーム画面の上下固定バナー広告。Pro版では表示しない。
 * 常に非パーソナライズ広告のみをリクエストする（設計: §4.1）。
 * EEA/UKの同意状況は `canShowAds()` が見る（同意が無ければ広告を出さない）。
 * 設置位置（上/下）は呼び出し側（ホーム画面）が決める。
 * 設計: docs/01_requirements/01_monetization_plan.md §4
 */
export const AdBanner: React.FC = () => {
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [adsAllowed, setAdsAllowed] = useState<boolean | null>(null);

  // 画面フォーカスのたびに評価し直す（同意状況は変化しうるため）
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([ProService.isPro(), canShowAds()])
        .then(([pro, allowed]) => {
          if (!cancelled) {
            setIsPro(pro);
            setAdsAllowed(allowed);
          }
        })
        .catch(() => {
          // 判定できないときは出さない（安全側に倒す）
          if (!cancelled) setAdsAllowed(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // 購入・復元・失効でPro状態が変わったら即座に反映する（双方向）。
  // フォーカス時の再評価だけだと、購入画面をモーダルで開いている間（Homeが
  // フォーカスを失わない）は購入直後もバナーが消えないため、これを別途購読する
  useEffect(() => {
    return onProStatusChange(setIsPro);
  }, []);

  // 判定前(null)・Pro版・同意なしでは出さない
  if (isPro !== false || adsAllowed !== true) return null;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={AD_UNIT_ID}
        size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
