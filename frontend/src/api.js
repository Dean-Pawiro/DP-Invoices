import axios from "axios";


const API_URL = process.env.REACT_APP_API_URL;
const API = axios.create({
	baseURL: API_URL,
	headers: {
		"Content-Type": "application/json",
	},
	withCredentials: true, // Always send cookies for session auth
});

export default API;
