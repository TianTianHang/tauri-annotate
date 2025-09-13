export interface Bbox {
  id: number;
  box: [number, number, number, number, number, number, number, number]; // [x1_a, y1_a, x2_a, y2_a, x1_b, y1_b, x2_b, y2_b]
  color: string;
}

export interface CamData {
  bboxes: Bbox[];
  image_data: string; // Base64 encoded image string
  frame_number: number;
}

export interface FrameData {
  status: string;
  message?:string;
  frame_number: number;
  cams: Record<string, CamData>;
  last_frame_num: number;
}

export interface Point {
  x: number;
  y: number;
}