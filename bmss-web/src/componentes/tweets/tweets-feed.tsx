// componentes/tweets/tweets-feed.tsx
"use client";

import { Suspense } from "react";
import { Twitter } from "lucide-react";
import TweetsFeedContent from "./TweetsFeedContent";


export default function TweetsFeed() {
  return (
    <div className="bg-neutral-900 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Twitter className="text-blue-400" size={28} />
        <h2 className="text-2xl font-bold text-white">Tweets em Tempo Real</h2>
      </div>
      <Suspense fallback={<TweetsLoading />}>
        <TweetsFeedContent />
      </Suspense>
    </div>
  );
}

function TweetsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-6 animate-pulse">
          <div className="h-4 bg-neutral-700 rounded w-32 mb-3" />
          <div className="h-5 bg-neutral-700 rounded w-full mb-2" />
          <div className="h-4 bg-neutral-700 rounded w-11/12" />
          <div className="h-4 bg-neutral-700 rounded w-10/12 mt-2" />
        </div>
      ))}
    </div>
  );
}