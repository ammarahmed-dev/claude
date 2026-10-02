import type { PageContext } from "vike/types";
import { assetBaseUrl, imageLoader } from "__CONSTANTS__";
import {
  canonicalUrl,
  favIconAsset,
  seoNoIndex,
  webclipAsset,
  pageBackgroundImageAssets,
  pageFontAssets,
  siteName,
} from "__CLIENT__";
import "__CSS__";

export const Head = ({}: { data: PageContext["data"] }) => {
  const ldJson = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
  };
  return (
    <>
      {siteName && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ldJson, null, 2),
          }}
        ></script>
      )}
      {favIconAsset && (
        <link
          rel="icon"
          href={imageLoader({
            src: `${assetBaseUrl}${favIconAsset}`,
            // width,height must be multiple of 48 https://developers.google.com/search/docs/appearance/favicon-in-search
            width: 144,
            height: 144,
            fit: "pad",
            quality: 100,
            format: "auto",
          })}
        />
      )}
      {webclipAsset && (
        <link
          rel="apple-touch-icon"
          href={imageLoader({
            src: `${assetBaseUrl}${webclipAsset}`,
            width: 180,
            height: 180,
            fit: "pad",
            quality: 100,
            format: "auto",
          })}
        />
      )}
      {seoNoIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {pageFontAssets.map((asset) => (
        <link
          key={asset}
          rel="preload"
          href={`${assetBaseUrl}${asset}`}
          as="font"
          crossOrigin="anonymous"
        />
      ))}
      {pageBackgroundImageAssets.map((asset) => (
        <link
          key={asset}
          rel="preload"
          href={`${assetBaseUrl}${asset}`}
          as="image"
        />
      ))}
    </>
  );
};
