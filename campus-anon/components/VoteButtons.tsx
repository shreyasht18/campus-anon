"use client";

import { ArrowBigUp, ArrowBigDown } from "lucide-react";
import { formatCount } from "../lib/utils";

interface Props {
  score: number;
  myVote: number;
  onVote: (value: 1 | -1) => void;
  size?: "sm" | "md";
}

export default function VoteButtons({ score, myVote, onVote, size = "md" }: Props) {
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const wrap =
    size === "sm" ? "gap-0.5 px-1 py-0.5" : "gap-1 px-1.5 py-1";

  const scoreColor =
    myVote === 1 ? "text-orange-500" : myVote === -1 ? "text-sky-400" : "text-gray-200";

  return (
    <div
      className={
        "inline-flex items-center rounded-full border border-white/10 bg-white/5 " + wrap
      }
    >
      <button
        type="button"
        onClick={() => onVote(1)}
        aria-label="Upvote"
        aria-pressed={myVote === 1}
        className={
          "rounded-full p-1 transition-colors hover:bg-orange-500/15 " +
          (myVote === 1 ? "text-orange-500" : "text-gray-400 hover:text-orange-400")
        }
      >
        <ArrowBigUp className={icon + (myVote === 1 ? " fill-current" : "")} />
      </button>
      <span
        className={
          "min-w-[1.5rem] text-center text-xs font-bold tabular-nums " + scoreColor
        }
      >
        {formatCount(score)}
      </span>
      <button
        type="button"
        onClick={() => onVote(-1)}
        aria-label="Downvote"
        aria-pressed={myVote === -1}
        className={
          "rounded-full p-1 transition-colors hover:bg-sky-500/15 " +
          (myVote === -1 ? "text-sky-400" : "text-gray-400 hover:text-sky-400")
        }
      >
        <ArrowBigDown className={icon + (myVote === -1 ? " fill-current" : "")} />
      </button>
    </div>
  );
}
