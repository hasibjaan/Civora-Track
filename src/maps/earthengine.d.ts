// The Earth Engine client has no published types. This declares only the calls CivicTrack
// uses, with the signatures read from @google/earthengine 1.7.x.
declare module "@google/earthengine" {
  interface ServiceAccountKey {
    client_email: string;
    private_key: string;
  }

  interface MapId {
    /** A tile URL template with {z}, {x} and {y} placeholders. */
    urlFormat: string;
  }

  interface EeImage {
    getMapId(
      visParams: Record<string, unknown>,
      callback: (mapId: MapId | undefined, error?: string) => void,
    ): void;
  }

  interface EeImageCollection {
    filterDate(start: string, end: string): EeImageCollection;
    filter(filter: unknown): EeImageCollection;
    median(): EeImage;
  }

  interface EarthEngine {
    data: {
      authenticateViaPrivateKey(
        key: ServiceAccountKey,
        onSuccess: () => void,
        onError: (error: unknown) => void,
      ): void;
    };
    initialize(
      baseUrl: null,
      tileUrl: null,
      onSuccess: () => void,
      onError: (error: unknown) => void,
      xsrfToken: null,
      project: string,
    ): void;
    ImageCollection(id: string): EeImageCollection;
    Filter: { lt(property: string, value: number): unknown };
  }

  const ee: EarthEngine;
  export default ee;
}
