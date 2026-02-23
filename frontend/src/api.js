import axios from "axios";

const API = axios.create({
	baseURL: process.env.REACT_APP_BACKEND_URL || "http://localhost:5000/api",
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true, // Always send cookies for session auth
});

export default API;
