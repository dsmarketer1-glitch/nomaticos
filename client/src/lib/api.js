import { supabase } from './supabase';

// Helper to get active user ID (placeholder for now, will be updated during Clerk integration)
const getUserId = () => 'ds.marketer1@gmail.com'; 

// ===== Clients =====
export const getClients = async () => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', getUserId())
    .order('name');
  
  if (error) throw error;

  // Safety parsing for JSON columns
  return (data || []).map(client => ({
    ...client,
    services: typeof client.services === 'string' ? JSON.parse(client.services) : (client.services || []),
    checklist: typeof client.checklist === 'string' ? JSON.parse(client.checklist) : (client.checklist || []),
  }));
};

export const createClient = async (data) => {
  const { data: result, error } = await supabase
    .from('clients')
    .insert([{ ...data, user_id: getUserId() }])
    .select()
    .single();
  if (error) throw error;
  return result;
};

export const updateClient = async (id, data) => {
  const { data: result, error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', id)
    .eq('user_id', getUserId())
    .select()
    .single();
  if (error) throw error;
  return result;
};

export const deleteClient = async (id) => {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('user_id', getUserId());
  if (error) throw error;
  return { id };
};

// ===== Tasks =====
export const getTasks = async (params = {}) => {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', getUserId());

  if (params.client_id) query = query.eq('client_id', params.client_id);
  if (params.status) query = query.eq('status', params.status);
  if (params.date) query = query.eq('date', params.date);

  const { data, error } = await query.order('date', { ascending: true });
  if (error) throw error;
  return data;
};

export const createTask = async (data) => {
  const { data: result, error } = await supabase
    .from('tasks')
    .insert([{ ...data, user_id: getUserId() }])
    .select()
    .single();
  if (error) throw error;
  return result;
};

export const bulkCreateTasks = async (tasks) => {
  const preparedTasks = tasks.map(t => ({ ...t, user_id: getUserId() }));
  const { data, error } = await supabase
    .from('tasks')
    .insert(preparedTasks);
  if (error) throw error;
  return data;
};

export const updateTask = async (id, data) => {
  const { data: result, error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .eq('user_id', getUserId())
    .select()
    .single();
  if (error) throw error;
  return result;
};

export const deleteTask = async (id) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', getUserId());
  if (error) throw error;
  return { id };
};

// ===== Payments =====
export const getPayments = async (params = {}) => {
  let query = supabase
    .from('client_payments')
    .select('*')
    .eq('user_id', getUserId());

  if (params.client_id) query = query.eq('client_id', params.client_id);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createPayment = async (data) => {
  const { data: result, error } = await supabase
    .from('client_payments')
    .insert([{ ...data, user_id: getUserId() }])
    .select()
    .single();
  if (error) throw error;
  return result;
};

export const updatePayment = async (id, data) => {
  const { data: result, error } = await supabase
    .from('client_payments')
    .update(data)
    .eq('id', id)
    .eq('user_id', getUserId())
    .select()
    .single();
  if (error) throw error;
  return result;
};

export const deletePayment = async (id) => {
  const { error } = await supabase
    .from('client_payments')
    .delete()
    .eq('id', id)
    .eq('user_id', getUserId());
  if (error) throw error;
  return { id };
};

// ===== Leads =====
export const getLeads = async () => {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', getUserId())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const createLead = async (data) => {
  const { data: result, error } = await supabase
    .from('leads')
    .insert([{ ...data, user_id: getUserId() }])
    .select()
    .single();
  if (error) throw error;
  return result;
};

export const updateLead = async (id, data) => {
  const { data: result, error } = await supabase
    .from('leads')
    .update(data)
    .eq('id', id)
    .eq('user_id', getUserId())
    .select()
    .single();
  if (error) throw error;
  return result;
};

export const deleteLead = async (id) => {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('user_id', getUserId());
  if (error) throw error;
  return { id };
};

export const convertLead = async (id) => {
  // We handle conversion in the frontend logic for simplicity with Supabase
  // Alternatively, we could use a Supabase Edge Function
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();
  
  if (leadError) throw leadError;

  const clientId = 'c_' + Math.random().toString(36).substr(2, 9);
  const { error: clientError } = await supabase
    .from('clients')
    .insert([{
      id: clientId,
      user_id: getUserId(),
      name: lead.client_name,
      company: lead.company_name,
      website: lead.website,
      location: lead.location,
      services: [lead.service_looking_for],
      payout: lead.closed_amount || 0,
      payout_type: 'Monthly'
    }]);

  if (clientError) throw clientError;

  await supabase
    .from('leads')
    .update({ status: 'Closed', is_converted: true, closed_at: new Date().toISOString() })
    .eq('id', id);

  return { message: 'Converted successfully', clientId };
};

export const uploadFile = async (file, path) => {
  const { data, error } = await supabase.storage
    .from('leads')
    .upload(path, file);
  
  if (error) throw error;
  
  const { data: publicUrl } = supabase.storage
    .from('leads')
    .getPublicUrl(data.path);
    
  return { url: publicUrl.publicUrl };
};

// ===== Goals =====
export const getGoal = async (month_year) => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('month_year', month_year)
    .eq('user_id', getUserId())
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is 'no rows returned'
  return data || { revenue_target: 0, leads_target: 0, tasks_target: 0 };
};

export const updateGoal = async (data) => {
  const { data: result, error } = await supabase
    .from('goals')
    .upsert({ ...data, user_id: getUserId() }, { onConflict: 'user_id,month_year' })
    .select()
    .single();
  if (error) throw error;
  return result;
};
