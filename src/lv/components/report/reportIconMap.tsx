// @ts-nocheck
"use client";
/**
 * Shared icon map for all report layouts.
 * Maps metric_icon string → React component with floating animation.
 */
import { BarChart2, Eye, MousePointer, Target, TrendingDown, DollarSign, TrendingUp, Users, Globe } from "lucide-react";
import {
  TargetArrowIcon,
  TargetDollarIcon,
  InstagramFollowersIcon,
  InstagramVisitsIcon,
  PostCommentsIcon,
  InstagramQualityIcon,
  WhatsAppGradientIcon,
  WhatsAppDollarIcon,
  WhatsAppMessageIcon,
  FloatingLucideIcon,
  GoldenQualitySealIcon,
} from "./ReportMetricIcons";
import React from "react";

// Wrap standard Lucide icons with floating animation
function wrapLucide(Icon: React.ComponentType<any>) {
  return React.forwardRef<any, any>((props, _ref) => (
    <FloatingLucideIcon Icon={Icon} {...props} />
  ));
}

const FloatingEye = wrapLucide(Eye);
const FloatingMousePointer = wrapLucide(MousePointer);
const FloatingTarget = wrapLucide(Target);
const FloatingTrendingDown = wrapLucide(TrendingDown);
const FloatingDollarSign = wrapLucide(DollarSign);
const FloatingTrendingUp = wrapLucide(TrendingUp);
const FloatingBarChart2 = wrapLucide(BarChart2);
const FloatingUsers = wrapLucide(Users);
const FloatingGlobe = wrapLucide(Globe);

export const REPORT_ICON_MAP: Record<string, any> = {
  Eye: FloatingEye,
  MousePointer: FloatingMousePointer,
  Target: FloatingTarget,
  TrendingDown: FloatingTrendingDown,
  DollarSign: FloatingDollarSign,
  TrendingUp: FloatingTrendingUp,
  BarChart2: FloatingBarChart2,
  Users: FloatingUsers,
  Globe: FloatingGlobe,
  MessageCircle: WhatsAppGradientIcon,
};

/**
 * Returns the best icon component for a given metric_key + metric_icon.
 * Custom composite icons override generic ones for specific metrics.
 */
export function getReportIcon(metricKey: string, metricIcon: string): any {
  // Custom composite icons by metric key
  switch (metricKey) {
    case "results":
      return TargetArrowIcon;
    case "cost_per_result":
      return TargetDollarIcon;
    case "instagram_followers":
      return InstagramFollowersIcon;
    case "instagram_profile_visits":
      return InstagramVisitsIcon;
    case "post_comments":
      return PostCommentsIcon;
    case "instagram_profile_quality":
      return InstagramQualityIcon;
    case "cost_per_message":
      return WhatsAppDollarIcon;
    case "messages_started":
      return WhatsAppMessageIcon;
    case "conversation_rate":
      return WhatsAppGradientIcon;
    case "saw_ad_whatsapp":
      return WhatsAppGradientIcon;
    case "creative_quality_ctr":
      return GoldenQualitySealIcon;
  }

  return REPORT_ICON_MAP[metricIcon] || FloatingBarChart2;
}
