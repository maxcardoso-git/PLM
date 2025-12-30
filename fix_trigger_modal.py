import re

with open("/root/PLM/frontend/src/pages/PipelineEditorPage.tsx", "r") as f:
    lines = f.readlines()
    content = "".join(lines)

# 1. Add formFieldsMap state
content = content.replace(
    "const [savingTrigger, setSavingTrigger] = useState(false);",
    "const [savingTrigger, setSavingTrigger] = useState(false);\n  const [formFieldsMap, setFormFieldsMap] = useState<Record<string, FormField[]>>({});"
)

# 2. Add fetchAttachedFormFields function before handleOpenFormModal
fetch_func = '''
  // Fetch fields for all attached forms of a stage
  const fetchAttachedFormFields = async (stage: Stage) => {
    if (!stage.formAttachRules || stage.formAttachRules.length === 0) return;
    const newFieldsMap: Record<string, FormField[]> = { ...formFieldsMap };
    console.log("[DEBUG] availableForms:", availableForms);
    for (const rule of stage.formAttachRules) {
      const formId = rule.formDefinitionId || rule.externalFormId;
      if (!formId || newFieldsMap[formId]) continue;
      const existingForm = availableForms.find(f => f.id === formId);
      if (existingForm) {
        const formAny = existingForm as any;
        console.log("[DEBUG] Form:", formId, Object.keys(formAny));
        const fields = existingForm.schemaJson?.fields || existingForm.fields || formAny?.schema?.fields || [];
        if (fields.length > 0) {
          newFieldsMap[formId] = fields.map((f: any) => ({
            id: f.id || f.key || f.name,
            name: f.name || f.label || f.id,
            type: f.type,
            label: f.label || f.name,
          }));
        }
      }
    }
    setFormFieldsMap(newFieldsMap);
  };

'''
content = content.replace(
    "const handleOpenFormModal = async (stage: Stage) => {",
    fetch_func + "const handleOpenFormModal = async (stage: Stage) => {"
)

# 3. Update handleOpenTriggerModal
content = content.replace(
    "await Promise.all([fetchIntegrations(), fetchForms()]);\n    setShowTriggerModal(true);",
    "await Promise.all([fetchIntegrations(), fetchForms()]);\n    await fetchAttachedFormFields(stage);\n    setShowTriggerModal(true);"
)

# 4. Update conditions to use formFieldsMap
content = content.replace(
    "const form = availableForms.find(f => f.id === formId);",
    "// Use formFieldsMap"
)
content = content.replace(
    "const fields = form?.schemaJson?.fields || form?.fields || [];",
    "const fields = formId ? (formFieldsMap[formId] || []) : [];"
)

# 5. Remove Campo (opcional) - more precise regex
# Match from <div> with Campo (opcional) to its closing </div>
pattern = r'''              <div>
                <label className="label">Campo \(opcional\)</label>
                \{\(\(\) => \{
                  // Find the form in availableForms to get schema/fields
                  const selectedForm = availableForms\.find\(f => f\.id === triggerForm\.formDefinitionId\);
                  const formFields = selectedForm\?\.schemaJson\?\.fields \|\| selectedForm\?\.fields \|\| \[\];

                  return formFields\.length > 0 \? \(
                    <select
                      value=\{triggerForm\.fieldId\}
                      onChange=\{\(e\) => setTriggerForm\(\{ \.\.\.triggerForm, fieldId: e\.target\.value \}\)\}
                      className="input mt-1"
                    >
                      <option value="">Qualquer campo</option>
                      \{formFields\.map\(\(field\) => \(
                        <option key=\{field\.id\} value=\{field\.id\}>
                          \{field\.label \|\| field\.name \|\| field\.id\}
                        </option>
                      \)\)\}
                    </select>
                  \) : \(
                    <input
                      type="text"
                      value=\{triggerForm\.fieldId\}
                      onChange=\{\(e\) => setTriggerForm\(\{ \.\.\.triggerForm, fieldId: e\.target\.value \}\)\}
                      className="input mt-1"
                      placeholder="Ex: status, amount, approved"
                    />
                  \);
                \}\)\(\)\}
                <p className="text-xs text-gray-500 mt-1">
                  \{triggerForm\.formDefinitionId
                    \? 'Selecione o campo que dispara o gatilho\.'
                    : 'Selecione um formulário para ver os campos disponíveis\.'\}
                </p>
              </div>'''

content = re.sub(pattern, '', content)

with open("/root/PLM/frontend/src/pages/PipelineEditorPage.tsx", "w") as f:
    f.write(content)

print("All changes applied!")
