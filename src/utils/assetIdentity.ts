import type { Asset } from '../types';

export const getAssetLogoUrl = (type: Asset['type'], ticker: string): string => {
  const folder = type === 'crypto' ? 'crypto' : 'stocks';
  const filename = ticker.toLowerCase().replace('.', '-');
  return `/assets/logos/${folder}/${filename}.svg`;
};

export const getHoldingAsset = (
  assets: Asset[],
  assetId: string,
  ticker: string
): Asset | undefined => assets.find((asset) => asset.id === assetId || asset.ticker === ticker);
