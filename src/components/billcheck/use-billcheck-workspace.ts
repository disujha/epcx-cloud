"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listUserOrganizations } from "@/lib/billcheck/data";
import type { Organization } from "@/types/firebase";

const STORAGE_KEY = "epcx-billcheck-organization";

export function useBillCheckWorkspace() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshOrganizations = useCallback(async () => {
    if (!user) {
      await Promise.resolve();
      setOrganizations([]);
      setOrganization(null);
      setLoading(false);
      return;
    }
    try {
      const items = await listUserOrganizations(user.uid);
      setOrganizations(items);
      const storedId = window.localStorage.getItem(STORAGE_KEY);
      const selected = items.find((item) => item.id === storedId) ?? items[0] ?? null;
      setOrganization(selected);
      if (selected) window.localStorage.setItem(STORAGE_KEY, selected.id);
      setError("");
      setLoading(false);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "BillCheck could not load your organizations.");
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (!user) {
        await Promise.resolve();
        if (active) { setOrganizations([]); setOrganization(null); setLoading(false); }
        return;
      }
      try {
        const items = await listUserOrganizations(user.uid);
        if (!active) return;
        setOrganizations(items);
        const storedId = window.localStorage.getItem(STORAGE_KEY);
        const selected = items.find((item) => item.id === storedId) ?? items[0] ?? null;
        setOrganization(selected);
        if (selected) window.localStorage.setItem(STORAGE_KEY, selected.id);
        setError("");
      } catch (reason: unknown) {
        if (active) setError(reason instanceof Error ? reason.message : "BillCheck could not load your organizations.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void refresh();
    return () => { active = false; };
  }, [user]);

  function selectOrganization(id: string) {
    const selected = organizations.find((item) => item.id === id) ?? null;
    setOrganization(selected);
    if (selected) window.localStorage.setItem(STORAGE_KEY, selected.id);
  }

  const isEditor = Boolean(
    user && organization &&
    (organization.adminIds?.includes(user.uid) || organization.billCheckEditorIds?.includes(user.uid))
  );
  const isAdmin = Boolean(user && organization?.adminIds?.includes(user.uid));

  return { user, organizations, organization, selectOrganization, refreshOrganizations, isEditor, isAdmin, loading, error };
}
