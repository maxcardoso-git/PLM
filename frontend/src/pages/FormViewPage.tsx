import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  validation?: Record<string, any>;
}

interface FormSchema {
  id: string;
  name: string;
  description?: string;
  version?: string;
  status: string;
  fields: FormField[];
  // Alternative field locations from different API structures
  formFields?: FormField[];
  sections?: { fields: FormField[] }[];
}

export function FormViewPage() {
  const { formId } = useParams<{ formId: string }>();
  const { settings, isConfigured } = useSettings();
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSchema = async () => {
    if (!isConfigured || !formId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/external-forms/proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseUrl: settings.externalForms.baseUrl,
          endpoint: `/data-entry-forms/external/${formId}/schema`,
          apiKey: settings.externalForms.apiKey,
          method: 'GET',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch form schema: ${response.status}`);
      }

      const data = await response.json();

      // Handle various API response structures
      let schemaData: FormSchema;
      if (data.schema) {
        schemaData = data.schema;
      } else if (data.data) {
        schemaData = data.data;
      } else if (data.form) {
        schemaData = data.form;
      } else {
        schemaData = data;
      }

      // Normalize fields array - might be in different locations
      if (!schemaData.fields) {
        if (data.fields) {
          schemaData.fields = data.fields;
        } else if (data.schema?.fields) {
          schemaData.fields = data.schema.fields;
        } else if (schemaData.formFields) {
          schemaData.fields = schemaData.formFields;
        } else if (schemaData.sections) {
          // Flatten sections into fields
          schemaData.fields = schemaData.sections.flatMap((s: any) => s.fields || []);
        }
      }

      console.log('Form schema response:', data);
      console.log('Normalized schema:', schemaData);

      setSchema(schemaData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch form schema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchema();
  }, [formId, isConfigured]);

  const getFieldTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      text: 'Text',
      textarea: 'Text Area',
      number: 'Number',
      email: 'Email',
      phone: 'Phone',
      date: 'Date',
      datetime: 'Date & Time',
      select: 'Dropdown',
      multiselect: 'Multi-Select',
      checkbox: 'Checkbox',
      radio: 'Radio',
      file: 'File Upload',
    };
    return types[type] || type;
  };

  if (!isConfigured) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto text-amber-500 mb-3" size={40} />
          <p className="text-amber-700">External Forms API not configured</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/forms"
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {loading ? 'Loading...' : schema?.name || 'Form Details'}
          </h1>
          {schema?.description && (
            <p className="text-sm text-gray-500 mt-1">{schema.description}</p>
          )}
        </div>
        <button
          onClick={fetchSchema}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : schema ? (
        <div className="space-y-6">
          {/* Form Info */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">ID</span>
                <p className="font-mono text-gray-900">{schema.id}</p>
              </div>
              <div>
                <span className="text-gray-500">Version</span>
                <p className="text-gray-900">{schema.version || 'N/A'}</p>
              </div>
              <div>
                <span className="text-gray-500">Status</span>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                    schema.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {schema.status}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Fields</span>
                <p className="text-gray-900">{schema.fields?.length || 0}</p>
              </div>
            </div>
          </div>

          {/* Fields Preview */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Form Fields</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {schema.fields?.map((field, index) => (
                <div key={field.id || index} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded">
                        <FileText className="text-gray-500" size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{field.label || field.name}</span>
                          {field.required && (
                            <span className="text-red-500 text-xs">*Required</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {field.name} &bull; {getFieldTypeLabel(field.type)}
                        </p>
                        {field.placeholder && (
                          <p className="text-xs text-gray-400 mt-1">
                            Placeholder: {field.placeholder}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {field.type}
                    </span>
                  </div>
                  {field.options && field.options.length > 0 && (
                    <div className="mt-3 ml-11 flex flex-wrap gap-1">
                      {field.options.map((opt, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {opt.label || opt.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(!schema.fields || schema.fields.length === 0) && (
                <div className="p-8 text-center text-gray-500">
                  No fields defined in this form
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
