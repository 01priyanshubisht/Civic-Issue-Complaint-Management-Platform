import api from './api';

class ComplaintService {
  async createComplaint(formData) {
    const response = await api.post('/complaints', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getMyComplaints() {
    const response = await api.get('/complaints/my');
    return response.data;
  }
  
  async getAllComplaints() {
    const response = await api.get('/complaints');
    return response.data;
  }

  async updateComplaintStatus(id, status) {
    const response = await api.patch(`/complaints/${id}`, { status });
    return response.data;
  }

  async getComplaintById(id) {
    const response = await api.get(`/complaints/${id}`);
    return response.data;
  }
}

export default new ComplaintService();
