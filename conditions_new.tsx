            {triggerForm.conditions.length > 0 ? (
              <div className="space-y-2">
                {triggerForm.conditions.map((condition, index) => {
                  // Card attributes
                  const cardFields = [
                    { id: 'title', name: 'Título' },
                    { id: 'description', name: 'Descrição' },
                    { id: 'priority', name: 'Prioridade' },
                    { id: 'status', name: 'Status' },
                  ];

                  // Get form fields from selected form
                  const selectedFormId = triggerForm.formDefinitionId;
                  const formFields = selectedFormId ? (formFieldsMap[selectedFormId] || []) : [];

                  // Determine source type from fieldPath prefix
                  const getSourceType = (path: string) => {
                    if (path.startsWith('card.')) return 'card';
                    if (path.startsWith('form.')) return 'form';
                    return '';
                  };

                  const sourceType = getSourceType(condition.fieldPath);

                  return (
                    <div key={index} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {/* Source Type Selector */}
                        <select
                          value={sourceType}
                          onChange={(e) => {
                            updateCondition(index, 'fieldPath', '');
                          }}
                          className="input text-xs w-44"
                        >
                          <option value="">Tipo de dados...</option>
                          <option value="card">Dados do Card</option>
                          <option value="form">Dados do Formulário</option>
                        </select>

                        {/* Field Selector - Card Fields */}
                        {sourceType === 'card' && (
                          <select
                            value={condition.fieldPath}
                            onChange={(e) => updateCondition(index, 'fieldPath', e.target.value)}
                            className="input text-xs flex-1"
                          >
                            <option value="">Selecione o campo...</option>
                            {cardFields.map((field) => (
                              <option key={field.id} value={`card.${field.id}`}>
                                {field.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Field Selector - Form Fields */}
                        {sourceType === 'form' && (
                          formFields.length > 0 ? (
                            <select
                              value={condition.fieldPath}
                              onChange={(e) => updateCondition(index, 'fieldPath', e.target.value)}
                              className="input text-xs flex-1"
                            >
                              <option value="">Selecione o campo...</option>
                              {formFields.map((field) => (
                                <option key={field.id} value={`form.${selectedFormId}.${field.id}`}>
                                  {field.label || field.name || field.id}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-amber-600 flex-1">
                              {selectedFormId ? 'Carregando campos...' : 'Selecione um formulário acima'}
                            </span>
                          )
                        )}

                        {/* Placeholder when no type selected */}
                        {!sourceType && (
                          <span className="text-xs text-gray-400 flex-1">
                            Selecione o tipo de dados primeiro
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => removeCondition(index)}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>

                      {/* Operator and Value - only show when field is selected */}
                      {condition.fieldPath && (
                        <div className="flex items-center gap-2 pl-44">
                          <select
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                            className="input text-xs w-32"
                          >
                            <option value="EQUALS">=</option>
                            <option value="NOT_EQUALS">≠</option>
                            <option value="GREATER_THAN">&gt;</option>
                            <option value="LESS_THAN">&lt;</option>
                            <option value="GREATER_OR_EQUAL">≥</option>
                            <option value="LESS_OR_EQUAL">≤</option>
                            <option value="CONTAINS">contém</option>
                            <option value="NOT_CONTAINS">não contém</option>
                            <option value="IS_EMPTY">vazio</option>
                            <option value="IS_NOT_EMPTY">não vazio</option>
                          </select>
                          <input
                            type="text"
                            value={condition.value}
                            onChange={(e) => updateCondition(index, 'value', e.target.value)}
                            className="input text-xs flex-1"
                            placeholder="Valor"
                            disabled={condition.operator === 'IS_EMPTY' || condition.operator === 'IS_NOT_EMPTY'}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-500 p-2 bg-gray-50 rounded-lg">
                Sem condições. O gatilho será executado sempre que o evento ocorrer.
              </p>
            )}
          </div>
