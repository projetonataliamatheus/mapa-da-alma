// @ts-nocheck
"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lv/integrations/supabase/client";

export interface ConnectorConfig {
  enabled: boolean;
  selectedEffect: string;
  color: string;
  thickness: number;
  dashLength: number;
  dashGap: number;
  speed: number;
}

const defaultConfig: ConnectorConfig = {
  enabled: true,
  selectedEffect: "pulse",
  color: "",
  thickness: 2,
  dashLength: 8,
  dashGap: 6,
  speed: 2,
};

export function useConnectorConfig() {
  const [config, setConfig] = useState<ConnectorConfig>(defaultConfig);

  useEffect(() => {
    supabase
      .from("sales_page_config")
      .select("config")
      .eq("id", "quote_connectors")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.config) {
          setConfig({ ...defaultConfig, ...(data.config as any) });
        }
      });
  }, []);

  return config;
}
