import { createContext, useContext, useState } from 'react';
import { useMyGarages, type OwnedGarage } from './garage';

type GarageContextValue = {
  garages: OwnedGarage[];
  garage: OwnedGarage | null;
  loading: boolean;
  selectGarage: (id: string) => void;
};

const GarageContext = createContext<GarageContextValue>({ garages: [], garage: null, loading: true, selectGarage: () => {} });
const STORAGE_KEY = 'garix.selectedGarage';

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Owners can run several garages; this remembers which one the app is working in. */
export function GarageProvider({ children }: { children: React.ReactNode }) {
  const garages = useMyGarages();
  const [selectedId, setSelectedId] = useState<string | null>(readStored);
  const list = garages.data ?? [];
  const garage = list.find((g) => g.id === selectedId) ?? list[0] ?? null;

  function selectGarage(id: string) {
    setSelectedId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // remembering the choice is a convenience only
    }
  }

  return (
    <GarageContext.Provider value={{ garages: list, garage, loading: garages.isPending, selectGarage }}>
      {children}
    </GarageContext.Provider>
  );
}

export function useGarage() {
  return useContext(GarageContext);
}
