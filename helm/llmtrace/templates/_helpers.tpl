{{/* Common labels */}}
{{- define "llmtrace.labels" -}}
app.kubernetes.io/name: llmtrace
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "llmtrace.apiImage" -}}
{{ .Values.image.registry }}/{{ .Values.image.api.repository }}:{{ .Values.image.api.tag }}
{{- end -}}

{{- define "llmtrace.workerImage" -}}
{{ .Values.image.registry }}/{{ .Values.image.worker.repository }}:{{ .Values.image.worker.tag }}
{{- end -}}

{{- define "llmtrace.webImage" -}}
{{ .Values.image.registry }}/{{ .Values.image.web.repository }}:{{ .Values.image.web.tag }}
{{- end -}}
