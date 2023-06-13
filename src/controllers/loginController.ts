import { db } from "../config/firebase";
import { Request, Response } from "express";
import * as admin from "firebase-admin";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export const loginUser = async (req: Request, res: Response) => {
  try {
    // Extract the required data from the request body
    const { usernameOrEmail, password } = req.body;

    // Check if all required fields are present
    if (!usernameOrEmail) {
      return res.status(400).json({ success: false, message: "Username or email is required", userLoggedIn: [] });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: "Password is required", userLoggedIn: [] });
    }

    // Find a user with the provided username or email
    let snapshot = await db
      .collection("databaseUser")
      .where("username", "==", usernameOrEmail)
      .limit(1)
      .get();

    // If no user is found with the username, try finding by email
    if (snapshot.empty) {
      const snapshotByEmail = await admin.firestore()
        .collection("databaseUser")
        .where("email", "==", usernameOrEmail)
        .limit(1)
        .get();

      if (snapshotByEmail.empty) {
        return res.status(400).json({ success: false, message: "Invalid credentials", userLoggedIn: [] });
      }

      // Use the user found by email
      snapshot = snapshotByEmail;
    }

    // Get the user data from the snapshot
    const user = snapshot.docs[0].data();

    // Check if the provided password matches the user's password
    if (user.password !== password) {
      return res.status(400).json({ success: false, message: "Invalid credentials", userLoggedIn: [] });
    }

    // Generate a JWT token with the user ID as the payload
    const token = jwt.sign({ userId: user.id }, JWT_SECRET);

    // Return a response with the JWT token and user data
    res.json({
      success: true, 
      message: "Login successful",
      userLoggedIn: [{
        id: user.id,
        username: user.username,
        token: token,
      }],
    });
  } catch (error) {
    // Return a response indicating failure
    res.status(500).json({ success: false, message: "Failed to login", userLoggedIn: [] });
  }
};
