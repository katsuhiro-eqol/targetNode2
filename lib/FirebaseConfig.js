import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
//import { getAuth, Auth } from "firebase/auth";
//import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    appKey: process.env.NEXT_PUBLIC_APIKEY,
    authDomain: process.env.NEXT_PUBLIC_AUTHDOMAIN,
    projectId: process.env.NEXT_PUBLIC_PROJECTID,
    storageBucket: process.env.NEXT_PUBLIC_STORAGEBUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_MESSAGINGSENDERID,
    appId: process.env.NEXT_PUBLIC_APPID
};

let app = FirebaseApp;
let db = getFirestore;
//let auth = Auth;

if (typeof window !== "undefined" && !getApps().length){
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    //auth = getAuth();
}

export { db }