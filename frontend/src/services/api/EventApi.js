import { axiosClient } from "../../api/axios";


export const EventApi = {
list(params = {}) {
return axiosClient.get("/evenements", { params }).then(r => r.data);
},
show(id) {
return axiosClient.get(`/evenements/${id}`).then(r => r.data);
},
};
export default EventApi;