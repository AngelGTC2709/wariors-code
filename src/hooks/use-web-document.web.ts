import { useEffect } from 'react';

// Idioma y título del documento en web. Se hace en el cliente porque un +html.tsx
// hizo que Metro se quedara sin memoria al renderizar en el servidor.
export function useWebDocument() {
  useEffect(() => {
    document.documentElement.lang = 'es-MX';
    document.title = 'Warrior Kids';
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.appendChild(description);
    }
    description.content = 'Hábitos, movimiento y recetas para crecer en familia.';
  }, []);
}
