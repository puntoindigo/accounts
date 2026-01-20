// Type definitions for WebHID API
// https://wicg.github.io/webhid/

interface HIDDevice extends EventTarget {
  readonly opened: boolean;
  readonly vendorId: number;
  readonly productId: number;
  readonly productName: string;
  readonly manufacturerName: string;
  readonly collections: HIDCollectionInfo[];

  open(): Promise<void>;
  close(): Promise<void>;
  sendReport(reportId: number, data: ArrayBuffer): Promise<void>;
  sendFeatureReport(reportId: number, data: ArrayBuffer): Promise<void>;
  receiveFeatureReport(reportId: number): Promise<DataView>;
  addEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void;
  removeEventListener(type: 'inputreport', listener: (event: HIDInputReportEvent) => void): void;
  addEventListener(type: 'disconnect', listener: () => void): void;
  removeEventListener(type: 'disconnect', listener: () => void): void;
}

interface HIDCollectionInfo {
  usage: number;
  usagePage: number;
  inputReports?: HIDReportInfo[];
  outputReports?: HIDReportInfo[];
  featureReports?: HIDReportInfo[];
}

interface HIDReportInfo {
  reportId?: number;
  items?: HIDReportItem[];
}

interface HIDReportItem {
  usage?: number;
  usagePage?: number;
  reportSize?: number;
  reportCount?: number;
}

interface HIDInputReportEvent extends Event {
  readonly device: HIDDevice;
  readonly reportId: number;
  readonly data: DataView;
}

interface HIDDeviceRequestOptions {
  filters: HIDDeviceFilter[];
}

interface HIDDeviceFilter {
  vendorId?: number;
  productId?: number;
  usagePage?: number;
  usage?: number;
}

interface Navigator {
  hid?: {
    requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>;
    getDevices(): Promise<HIDDevice[]>;
  };
}
