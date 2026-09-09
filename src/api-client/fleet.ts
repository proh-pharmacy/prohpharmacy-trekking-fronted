import apiClient from './api';

// ── Enums ──────────────────────────────────────────────────────────────
export type OperationalStatus = 'Active' | 'UnderMaintenance' | 'Decommissioned';
export type DeviceStatus = 'Active' | 'Inactive';

// ── Vehicle ────────────────────────────────────────────────────────────
export interface Vehicle {
  id: string;
  registrationNumber: string;
  displayName: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  branchId: string;
  branchName: string;
  operationalStatus: OperationalStatus;
  currentStaffId?: string | null;
  currentStaffName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateVehiclePayload {
  registrationNumber: string;
  displayName: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  branchId?: string;
}

export interface UpdateVehiclePayload {
  displayName: string;
  make: string;
  model: string;
  year: number;
  colour: string;
  branchId?: string;
}

// ── Tracking Device ────────────────────────────────────────────────────
export interface TrackingDevice {
  id: string;
  traccarDeviceId: number | null;
  traccarUniqueId: string;
  name: string;
  phoneNumber: string | null;
  status: DeviceStatus;
  vehicleId: string;
  vehicleRegistration: string;
  staffMemberId: string | null;
  staffName: string | null;
  lastReportedAt: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastAddress: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateDevicePayload {
  vehicleId: string;
  uniqueId?: string;
  phoneNumber?: string;
}

export interface UpdateDevicePayload {
  name: string;
  phoneNumber?: string;
  traccarDeviceId?: number | null;
}

export interface AssignStaffPayload {
  staffMemberId: string;
  notes?: string;
}

// ── Fleet Driver ───────────────────────────────────────────────────────
export interface FleetDriver {
  id: string;
  staffMemberId: string;
  staffName: string;
  phoneNumber: string | null;
  branchName: string | null;
  traccarDriverId: number | null;
  traccarUniqueId: string | null;
  isSynced: boolean;
  createdAt: string;
  updatedAt: string | null;
}

// ── Traccar User ───────────────────────────────────────────────────────
export interface TraccarUser {
  id: number;
  name: string;
  email: string;
  administrator: boolean;
  disabled: boolean;
  deviceLimit: number;
  expirationTime: string | null;
}

export interface CreateTraccarUserPayload {
  name: string;
  email: string;
  password: string;
  administrator?: boolean;
}

export interface UpdateTraccarUserPayload {
  name: string;
  email: string;
  password?: string;
  administrator: boolean;
  disabled: boolean;
}

// ── API ────────────────────────────────────────────────────────────────
export const fleetApi = {
  // ── Vehicles ──────────────────────────────────────────────────────
  getVehicles: async (params?: {
    search?: string;
    sort?: string;
    pageNumber?: number;
    pageSize?: number;
    branchId?: string;
    status?: string;
  }) => {
    const res = await apiClient.get<any>('/fleet/vehicles', { params });
    return res.data;
  },

  getVehicle: async (id: string): Promise<Vehicle> => {
    const res = await apiClient.get<Vehicle>(`/fleet/vehicles/${id}`);
    return res.data;
  },

  createVehicle: async (payload: CreateVehiclePayload): Promise<Vehicle> => {
    const res = await apiClient.post<Vehicle>('/fleet/vehicles', payload);
    return res.data;
  },

  updateVehicle: async (id: string, payload: UpdateVehiclePayload): Promise<Vehicle> => {
    const res = await apiClient.put<Vehicle>(`/fleet/vehicles/${id}`, payload);
    return res.data;
  },

  changeVehicleStatus: async (id: string, status: OperationalStatus) => {
    const res = await apiClient.patch(`/fleet/vehicles/${id}/status`, { status });
    return res.data;
  },

  assignVehicleStaff: async (vehicleId: string, payload: AssignStaffPayload) => {
    const res = await apiClient.post(`/fleet/vehicles/${vehicleId}/assign-staff`, payload);
    return res.data;
  },

  assignDeviceStaff: async (deviceId: string, payload: AssignStaffPayload) => {
    const device = await fleetApi.getDevice(deviceId);
    if (!device.vehicleId) {
      throw new Error('Device is not assigned to any vehicle');
    }
    return fleetApi.assignVehicleStaff(device.vehicleId, payload);
  },

  unassignVehicleStaff: async (vehicleId: string) => {
    await apiClient.post(`/fleet/vehicles/${vehicleId}/unassign-staff`);
  },

  // ── Devices ───────────────────────────────────────────────────────
  getDevices: async (params?: {
    search?: string;
    sort?: string;
    pageNumber?: number;
    pageSize?: number;
    status?: string;
  }) => {
    const res = await apiClient.get<any>('/fleet/devices', { params });
    return res.data;
  },

  getDevice: async (id: string): Promise<TrackingDevice> => {
    const res = await apiClient.get<TrackingDevice>(`/fleet/devices/${id}`);
    return res.data;
  },

  createDevice: async (payload: CreateDevicePayload): Promise<TrackingDevice> => {
    const res = await apiClient.post<TrackingDevice>('/fleet/devices', payload);
    return res.data;
  },

  updateDevice: async (id: string, payload: UpdateDevicePayload): Promise<TrackingDevice> => {
    const res = await apiClient.put<TrackingDevice>(`/fleet/devices/${id}`, payload);
    return res.data;
  },

  deleteDevice: async (id: string) => {
    await apiClient.delete(`/fleet/devices/${id}`);
  },

  syncDevices: async (force = false) => {
    const res = await apiClient.post('/fleet/devices/sync', null, { params: { force } });
    return res.data;
  },

  // ── Drivers ───────────────────────────────────────────────────────
  getDrivers: async (params?: { synced?: boolean }): Promise<FleetDriver[]> => {
    const res = await apiClient.get<FleetDriver[]>('/fleet/drivers', { params });
    return res.data;
  },

  createDriver: async (staffMemberId: string) => {
    const res = await apiClient.post('/fleet/drivers', { staffMemberId });
    return res.data;
  },

  deleteDriver: async (staffMemberId: string) => {
    await apiClient.delete(`/fleet/drivers/${staffMemberId}`);
  },

  syncDrivers: async (force = false) => {
    const res = await apiClient.post('/fleet/drivers/sync', null, { params: { force } });
    return res.data;
  },

  // ── Traccar Users ─────────────────────────────────────────────────
  getTraccarUsers: async (): Promise<TraccarUser[]> => {
    const res = await apiClient.get<TraccarUser[]>('/fleet/traccar-users');
    return res.data;
  },

  createTraccarUser: async (payload: CreateTraccarUserPayload): Promise<TraccarUser> => {
    const res = await apiClient.post<TraccarUser>('/fleet/traccar-users', payload);
    return res.data;
  },

  updateTraccarUser: async (traccarUserId: number, payload: UpdateTraccarUserPayload): Promise<TraccarUser> => {
    const res = await apiClient.put<TraccarUser>(`/fleet/traccar-users/${traccarUserId}`, payload);
    return res.data;
  },

  deleteTraccarUser: async (traccarUserId: number) => {
    await apiClient.delete(`/fleet/traccar-users/${traccarUserId}`);
  },

  // ── Live Tracking ─────────────────────────────────────────────────
  getPositions: async (branchId?: string): Promise<DeviceLastPosition[]> => {
    const params = branchId ? { branchId } : undefined;
    const res = await apiClient.get<DeviceLastPosition[]>('/fleet/positions', { params });
    return res.data;
  },

  getDeviceLivePosition: async (deviceId: string): Promise<DeviceLivePosition> => {
    const res = await apiClient.get<DeviceLivePosition>(`/fleet/devices/${deviceId}/position`);
    return res.data;
  },

  getDevicePositionHistory: async (
    deviceId: string,
    from: string,
    to: string
  ): Promise<PositionHistoryPoint[]> => {
    const res = await apiClient.get<PositionHistoryPoint[]>(
      `/fleet/devices/${deviceId}/position/history`,
      { params: { from, to } }
    );
    return res.data;
  },
};

// ── Live Tracking Types ────────────────────────────────────────────────
export interface DeviceLastPosition {
  deviceId: string;
  deviceName: string;
  staffMemberId: string | null;
  staffName: string | null;
  vehicleId: string;
  vehicleRegistration: string;
  vehicleDisplayName?: string | null;
  branchId: string | null;
  branchName: string | null;
  latitude: number;
  longitude: number;
  lastAddress: string | null;
  lastReportedAt: string;
  // Dynamic live fields updated via SignalR
  speed?: number | null;
  course?: number | null;
  ignition?: boolean | null;
  motion?: boolean | null;
  batteryLevel?: number | null;
  valid?: boolean;
}

export interface DeviceLivePosition {
  deviceId: string;
  deviceName: string;
  staffMemberId: string | null;
  staffName: string | null;
  vehicleId: string;
  vehicleRegistration: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  address: string | null;
  ignition: boolean | null;
  motion: boolean | null;
  batteryLevel: number | null;
  fixTime: string;
  valid: boolean;
}

export interface PositionHistoryPoint {
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  address: string | null;
  ignition: boolean | null;
  motion: boolean | null;
  batteryLevel: number | null;
  fixTime: string;
  valid: boolean;
}

export interface PositionUpdateEvent {
  deviceId: string;
  traccarDeviceId?: number;
  staffMemberId: string | null;
  staffName: string | null;
  vehicleId: string;
  vehicleRegistration: string;
  branchId: string | null;
  branchName: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  fixTime: string;
  valid: boolean;
  ignition: boolean | null;
  motion: boolean | null;
  batteryLevel: number | null;
  address: string | null;
}

/**
 * Resolves the SignalR Tracking Hub URL based on the API base URL or environment override.
 */
export const getTrackingHubUrl = (): string => {
  const envHubUrl = (import.meta as any).env?.VITE_HUB_URL;
  if (envHubUrl) {
    return envHubUrl;
  }
  const apiBase: string = ((import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1')
    .trim()
    .replace(/\/+$/, '');
  const rootOrigin = apiBase.replace(/\/api(\/v\d+)?\/?$/, '');
  return `${rootOrigin}/hubs/tracking`;
};
