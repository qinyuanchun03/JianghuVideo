import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MacCMSVideo, MacCMSCategory } from '../types';

interface HomeContextType {
  categories: MacCMSCategory[];
  setCategories: (cats: MacCMSCategory[]) => void;
  groupedVideos: Record<string, MacCMSVideo[]>;
  setGroupedVideos: (groups: Record<string, MacCMSVideo[]>) => void;
  featuredVideo: MacCMSVideo | null;
  setFeaturedVideo: (video: MacCMSVideo | null) => void;
  recommendedVideos: MacCMSVideo[];
  setRecommendedVideos: (videos: MacCMSVideo[]) => void;
  gridVideos: MacCMSVideo[];
  setGridVideos: (videos: MacCMSVideo[]) => void;
  activeCategory: number | undefined;
  setActiveCategory: (id: number | undefined) => void;
  page: number;
  setPage: (p: number) => void;
  hasMore: boolean;
  setHasMore: (h: boolean) => void;
  isInitialized: boolean;
  setIsInitialized: (i: boolean) => void;
  scrollPosition: number;
  setScrollPosition: (p: number) => void;
}

const HomeContext = createContext<HomeContextType | undefined>(undefined);

export const HomeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<MacCMSCategory[]>([]);
  const [groupedVideos, setGroupedVideos] = useState<Record<string, MacCMSVideo[]>>({});
  const [featuredVideo, setFeaturedVideo] = useState<MacCMSVideo | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<MacCMSVideo[]>([]);
  const [gridVideos, setGridVideos] = useState<MacCMSVideo[]>([]);
  const [activeCategory, setActiveCategory] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  return (
    <HomeContext.Provider value={{
      categories, setCategories,
      groupedVideos, setGroupedVideos,
      featuredVideo, setFeaturedVideo,
      recommendedVideos, setRecommendedVideos,
      gridVideos, setGridVideos,
      activeCategory, setActiveCategory,
      page, setPage,
      hasMore, setHasMore,
      isInitialized, setIsInitialized,
      scrollPosition, setScrollPosition
    }}>
      {children}
    </HomeContext.Provider>
  );
};

export const useHome = () => {
  const context = useContext(HomeContext);
  if (context === undefined) {
    throw new Error('useHome must be used within a HomeProvider');
  }
  return context;
};
