export type ListingInput = {
  title: string;
  description: string;
  priceIdr: number;
  videoUrl: string;
  isSold: boolean;
};

export type PublicListingCard = {
  id: string;
  code: string;
  title: string;
  priceIdr: number;
  isSold: boolean;
  thumbnailPath: string;
  createdAt: Date;
};

export type PublicListing = PublicListingCard & {
  description: string;
  videoProvider: "youtube" | "tiktok" | "google_drive";
  videoUrl: string;
  soldAt: Date | null;
};
