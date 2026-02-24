import axios from "axios";

const API_URL = window.location.origin;
const API = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true, // Always send cookies for session auth
});

export default API;
