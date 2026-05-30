import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import User from '../models/User';
import Video from '../models/Video';
import Camera from '../models/Camera';
import Detection from '../models/Detection';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/antigravity-surveillance';

const MOCK_FRAMES = {
  suspectRedShirtEntrance: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><rect width='100%' height='100%' fill='%2318181b'/><text x='50%' y='40%' font-family='sans-serif' font-size='20' fill='%2306b6d4' text-anchor='middle'>[CAM-01] ENTRANCE LOBBY</text><text x='50%' y='55%' font-family='sans-serif' font-size='14' fill='%23f43f5e' text-anchor='middle'>DETECTED: Male in Red T-Shirt &amp; Blue Jeans</text><rect x='120' y='60' width='120' height='240' fill='none' stroke='%23f43f5e' stroke-width='2'/><text x='130' y='80' font-family='monospace' font-size='12' fill='%23f43f5e'>SUSPECT (94%)</text></svg>",
  suspectRedShirtParking: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><rect width='100%' height='100%' fill='%2318181b'/><text x='50%' y='40%' font-family='sans-serif' font-size='20' fill='%2306b6d4' text-anchor='middle'>[CAM-02] PARKING AREA B</text><text x='50%' y='55%' font-family='sans-serif' font-size='14' fill='%23f43f5e' text-anchor='middle'>DETECTED: Male in Red T-Shirt near Sedan</text><rect x='280' y='100' width='100%' height='200' fill='none' stroke='%23f43f5e' stroke-width='2'/><text x='290' y='120' font-family='monospace' font-size='12' fill='%23f43f5e'>SUSPECT (88%)</text></svg>",
  suspectRedShirtExit: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><rect width='100%' height='100%' fill='%2318181b'/><text x='50%' y='40%' font-family='sans-serif' font-size='20' fill='%2306b6d4' text-anchor='middle'>[CAM-03] NORTH EXIT DOCK</text><text x='50%' y='55%' font-family='sans-serif' font-size='14' fill='%23f43f5e' text-anchor='middle'>DETECTED: Male in Red T-Shirt exiting gate</text><rect x='340' y='80' width='140' height='260' fill='none' stroke='%23f43f5e' stroke-width='2'/><text x='350' y='100' font-family='monospace' font-size='12' fill='%23f43f5e'>SUSPECT (91%)</text></svg>",
  womanYellowJacket: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><rect width='100%' height='100%' fill='%2318181b'/><text x='50%' y='40%' font-family='sans-serif' font-size='20' fill='%2306b6d4' text-anchor='middle'>[CAM-01] ENTRANCE LOBBY</text><text x='50%' y='55%' font-family='sans-serif' font-size='14' fill='%23f59e0b' text-anchor='middle'>DETECTED: Female in Yellow Jacket &amp; Black Pants</text><rect x='200' y='80' width='110' height='220' fill='none' stroke='%23f59e0b' stroke-width='2'/><text x='210' y='100' font-family='monospace' font-size='12' fill='%23f59e0b'>PERSON_02 (90%)</text></svg>",
  deliveryCourier: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360' viewBox='0 0 640 360'><rect width='100%' height='100%' fill='%2318181b'/><text x='50%' y='40%' font-family='sans-serif' font-size='20' fill='%2306b6d4' text-anchor='middle'>[CAM-03] NORTH EXIT DOCK</text><text x='50%' y='55%' font-family='sans-serif' font-size='14' fill='%2310b981' text-anchor='middle'>DETECTED: Delivery courier with box</text><rect x='150' y='120' width='180' height='200' fill='none' stroke='%2310b981' stroke-width='2'/><text x='160' y='140' font-family='monospace' font-size='12' fill='%2310b981'>COURIER (95%)</text></svg>"
};

const SAMPLE_VIDEOS = {
  entrance: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  lobby: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  parking: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
};

async function runSeed() {
  try {
    console.log('Connecting to MongoDB at:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    
    // Clear Collections
    console.log('Clearing database tables...');
    await User.deleteMany({});
    await Video.deleteMany({});
    await Camera.deleteMany({});
    await Detection.deleteMany({});

    // 1. Create Default Operator User
    console.log('Creating operator user credentials...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    const defaultUser = await User.create({
      name: 'Operator AI Surviellance',
      email: 'admin@aisurviellance.com',
      password: hashedPassword,
      role: 'admin',
    });

    // 2. Create Surveillance Cameras
    console.log('Registering camera nodes...');
    const cameras = [
      {
        cameraId: 'CAM-01',
        sourceName: 'Entrance Lobby Feed',
        ipAddress: '192.168.10.15',
        location: { lat: 37.7749, lng: -122.4194 }
      },
      {
        cameraId: 'CAM-02',
        sourceName: 'Parking Area B',
        ipAddress: '192.168.10.18',
        location: { lat: 37.7752, lng: -122.4188 }
      },
      {
        cameraId: 'CAM-03',
        sourceName: 'North Exit Dock & Gate',
        ipAddress: '192.168.10.22',
        location: { lat: 37.7758, lng: -122.4180 }
      }
    ];
    await Camera.insertMany(cameras);

    // 3. Create Videos
    console.log('Seeding video streams...');
    const videoData = [
      {
        title: 'Entrance Lobby Feed - 29 May 2026',
        fileUrl: SAMPLE_VIDEOS.lobby,
        thumbnailUrl: MOCK_FRAMES.suspectRedShirtEntrance,
        cameraId: 'CAM-01',
        ipAddress: '192.168.10.15',
        latitude: 37.7749,
        longitude: -122.4194,
        duration: 35,
        recordingStartTime: new Date('2026-05-29T10:00:00Z'),
        status: 'completed',
      },
      {
        title: 'Parking Area B - Outer Perimeter',
        fileUrl: SAMPLE_VIDEOS.parking,
        thumbnailUrl: MOCK_FRAMES.suspectRedShirtParking,
        cameraId: 'CAM-02',
        ipAddress: '192.168.10.18',
        latitude: 37.7752,
        longitude: -122.4188,
        duration: 40,
        recordingStartTime: new Date('2026-05-29T10:05:00Z'),
        status: 'completed',
      },
      {
        title: 'North Exit Dock & Gate',
        fileUrl: SAMPLE_VIDEOS.entrance,
        thumbnailUrl: MOCK_FRAMES.suspectRedShirtExit,
        cameraId: 'CAM-03',
        ipAddress: '192.168.10.22',
        latitude: 37.7758,
        longitude: -122.4180,
        duration: 30,
        recordingStartTime: new Date('2026-05-29T10:08:00Z'),
        status: 'completed',
      }
    ];

    const seededVideos = await Video.insertMany(videoData);

    // 4. Create Detections
    console.log('Writing incident detections...');
    const detections = [
      {
        videoId: seededVideos[0]._id,
        cameraName: 'Entrance Lobby Feed',
        cameraId: 'CAM-01',
        timestamp: 4.5,
        formattedTime: '10:00:04',
        confidence: 0.94,
        location: { lat: 37.7749, lng: -122.4194 },
        clothing: {
          shirt_type: 'T-Shirt',
          shirt_color: 'red',
          pants_type: 'jeans',
          pants_color: 'blue',
        },
        accessories: ['backpack', 'sunglasses'],
        gender_estimate: 'male',
        description: 'A male wearing a red T-shirt and blue jeans is carrying a black backpack near the front desk.',
        tags: ['red', 't-shirt', 'blue', 'jeans', 'backpack', 'sunglasses', 'male', 'suspect'],
        frameUrl: MOCK_FRAMES.suspectRedShirtEntrance
      },
      {
        videoId: seededVideos[0]._id,
        cameraName: 'Entrance Lobby Feed',
        cameraId: 'CAM-01',
        timestamp: 18.0,
        formattedTime: '10:00:18',
        confidence: 0.90,
        location: { lat: 37.7749, lng: -122.4194 },
        clothing: {
          shirt_type: 'Jacket',
          shirt_color: 'yellow',
          pants_type: 'trousers',
          pants_color: 'black',
        },
        accessories: ['purse'],
        gender_estimate: 'female',
        description: 'A female in a bright yellow jacket and black trousers passes through the main hallway security scan.',
        tags: ['yellow', 'jacket', 'black', 'trousers', 'purse', 'female'],
        frameUrl: MOCK_FRAMES.womanYellowJacket
      },
      {
        videoId: seededVideos[1]._id,
        cameraName: 'Parking Area B',
        cameraId: 'CAM-02',
        timestamp: 14.2,
        formattedTime: '10:05:14',
        confidence: 0.88,
        location: { lat: 37.7752, lng: -122.4188 },
        clothing: {
          shirt_type: 'T-Shirt',
          shirt_color: 'red',
          pants_type: 'jeans',
          pants_color: 'blue',
        },
        accessories: ['backpack'],
        gender_estimate: 'male',
        description: 'Person in red shirt and jeans walking between parked vehicles in Row D, looking at window panes.',
        tags: ['red', 't-shirt', 'blue', 'jeans', 'backpack', 'male', 'suspect'],
        frameUrl: MOCK_FRAMES.suspectRedShirtParking
      },
      {
        videoId: seededVideos[2]._id,
        cameraName: 'North Exit Dock & Gate',
        cameraId: 'CAM-03',
        timestamp: 8.5,
        formattedTime: '10:08:08',
        confidence: 0.95,
        location: { lat: 37.7758, lng: -122.4180 },
        clothing: {
          shirt_type: 'Polo Shirt',
          shirt_color: 'green',
          pants_type: 'shorts',
          pants_color: 'grey',
        },
        accessories: ['delivery box'],
        gender_estimate: 'male',
        description: 'A courier wearing a green polo shirt carrying a cardboard package passes through the gate exit.',
        tags: ['green', 'polo', 'grey', 'shorts', 'delivery box', 'male', 'courier'],
        frameUrl: MOCK_FRAMES.deliveryCourier
      },
      {
        videoId: seededVideos[2]._id,
        cameraName: 'North Exit Dock & Gate',
        cameraId: 'CAM-03',
        timestamp: 22.0,
        formattedTime: '10:08:22',
        confidence: 0.91,
        location: { lat: 37.7758, lng: -122.4180 },
        clothing: {
          shirt_type: 'T-Shirt',
          shirt_color: 'red',
          pants_type: 'jeans',
          pants_color: 'blue',
        },
        accessories: ['backpack', 'sunglasses'],
        gender_estimate: 'male',
        description: 'Suspect wearing red t-shirt, blue jeans, and sunglasses exits the facility perimeter via the north gate.',
        tags: ['red', 't-shirt', 'blue', 'jeans', 'backpack', 'sunglasses', 'male', 'suspect'],
        frameUrl: MOCK_FRAMES.suspectRedShirtExit
      }
    ];

    await Detection.insertMany(detections);

    console.log('================================================================');
    console.log('Database seeding successfully completed.');
    console.log(`Default User: admin@aisurviellance.com`);
    console.log(`Password: password123`);
    console.log('================================================================');
    
    await mongoose.connection.close();
    process.exit(0);

  } catch (err) {
    console.error('Database seeding failed:', err);
    process.exit(1);
  }
}

runSeed();
