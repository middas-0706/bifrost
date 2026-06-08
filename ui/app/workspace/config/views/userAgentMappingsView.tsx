import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
	getErrorMessage,
	type UserAgentMapping,
	type UserAgentMappingMatchType,
	type UserAgentMappingPayload,
	useCreateUserAgentMappingMutation,
	useDeleteUserAgentMappingMutation,
	useGetUserAgentMappingsQuery,
	useUpdateUserAgentMappingMutation,
} from "@/lib/store";
import { Plus, Save, Trash2, Upload, X } from "lucide-react";
import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const matchTypeOptions: Array<{ value: UserAgentMappingMatchType; label: string }> = [
	{ value: "contains", label: "Contains" },
	{ value: "starts_with", label: "Starts with" },
	{ value: "exact", label: "Exact match" },
	{ value: "regex", label: "Regex" },
];

const emptyDraft: UserAgentMappingPayload = {
	pattern: "",
	match_type: "contains",
	app: "",
	logo: undefined,
	logo_mime: null,
	is_active: true,
};

interface UserAgentMappingsViewProps {
	disabled?: boolean;
}

export default function UserAgentMappingsView({ disabled }: UserAgentMappingsViewProps) {
	const { data, isLoading } = useGetUserAgentMappingsQuery();
	const [createMapping, { isLoading: isCreating }] = useCreateUserAgentMappingMutation();
	const [updateMapping, { isLoading: isUpdating }] = useUpdateUserAgentMappingMutation();
	const [deleteMapping, { isLoading: isDeleting }] = useDeleteUserAgentMappingMutation();
	const [newDraft, setNewDraft] = useState<UserAgentMappingPayload>(emptyDraft);
	const [drafts, setDrafts] = useState<Record<string, UserAgentMappingPayload>>({});
	const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

	const mappings = useMemo(() => data?.mappings ?? [], [data]);
	const controlsDisabled = disabled || isCreating || isUpdating || isDeleting;

	useEffect(() => {
		setDrafts((prev) => {
			const next: Record<string, UserAgentMappingPayload> = {};
			for (const mapping of mappings) {
				next[mapping.id] = prev[mapping.id] ?? mappingToPayload(mapping);
			}
			return next;
		});
	}, [mappings]);

	const handleCreate = async () => {
		const validated = validateDraft(newDraft);
		if (!validated) return;
		try {
			await createMapping(validated).unwrap();
			setNewDraft(emptyDraft);
			setIsAddSheetOpen(false);
			toast.success("User agent mapping added.");
		} catch (error) {
			toast.error(`Failed to add mapping: ${getErrorMessage(error)}`);
		}
	};

	const handleSave = async (id: string) => {
		const validated = validateDraft(drafts[id]);
		if (!validated) return;
		try {
			await updateMapping({ id, data: validated }).unwrap();
			toast.success("User agent mapping updated.");
		} catch (error) {
			toast.error(`Failed to update mapping: ${getErrorMessage(error)}`);
		}
	};

	const handleDelete = async (id: string) => {
		try {
			await deleteMapping(id).unwrap();
			toast.success("User agent mapping deleted.");
		} catch (error) {
			toast.error(`Failed to delete mapping: ${getErrorMessage(error)}`);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h3 className="text-lg font-semibold tracking-tight">User Agent Mappings</h3>
					<p className="text-muted-foreground text-sm">Map incoming User-Agent strings to app names and optional logos used in logs.</p>
				</div>
				<div className="pt-2">
					<Button type="button" variant="outline" size="sm" onClick={() => setIsAddSheetOpen(true)} disabled={controlsDisabled}>
						<Plus className="h-4 w-4" />
						Add
					</Button>
				</div>
			</div>

			<Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
				<SheetContent className="p-0">
					<SheetHeader className="flex flex-col items-start px-6 pt-6">
						<SheetTitle>Add User Agent Mapping</SheetTitle>
						<SheetDescription>Define how a User-Agent value maps to an app label in logs.</SheetDescription>
					</SheetHeader>
					<div className="flex-1 space-y-4 px-6">
						<MappingForm draft={newDraft} onChange={setNewDraft} disabled={controlsDisabled} />
					</div>
					<SheetFooter className="flex-row justify-end border-t px-6 py-4">
						<Button type="button" variant="outline" onClick={() => setIsAddSheetOpen(false)}>
							Cancel
						</Button>
						<Button type="button" onClick={handleCreate} disabled={controlsDisabled}>
							Add Mapping
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>

			<Table containerClassName="rounded-sm border">
				<TableHeader>
					<TableRow>
						<TableHead>Pattern</TableHead>
						<TableHead>Match</TableHead>
						<TableHead>App</TableHead>
						<TableHead>Logo</TableHead>
						<TableHead>Active</TableHead>
						<TableHead className="w-[92px] text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading ? (
						<TableRow>
							<TableCell colSpan={6} className="text-muted-foreground py-6 text-center">
								Loading mappings...
							</TableCell>
						</TableRow>
					) : mappings.length === 0 ? (
						<TableRow>
							<TableCell colSpan={6} className="text-muted-foreground py-6 text-center">
								No user agent mappings configured.
							</TableCell>
						</TableRow>
					) : (
						mappings.map((mapping) => {
							const draft = drafts[mapping.id] ?? mappingToPayload(mapping);
							return (
								<TableRow key={mapping.id}>
									<TableCell className="min-w-[220px]">
										<Input
											value={draft.pattern}
											onChange={(event) => updateDraft(mapping.id, { pattern: event.target.value }, setDrafts)}
											disabled={controlsDisabled}
										/>
									</TableCell>
									<TableCell>
										<MatchTypeSelect
											value={draft.match_type}
											onChange={(matchType) => updateDraft(mapping.id, { match_type: matchType }, setDrafts)}
											disabled={controlsDisabled}
										/>
									</TableCell>
									<TableCell className="min-w-[180px]">
										<Input
											value={draft.app}
											onChange={(event) => updateDraft(mapping.id, { app: event.target.value }, setDrafts)}
											disabled={controlsDisabled}
										/>
									</TableCell>
									<TableCell>
										<LogoInput draft={draft} onChange={(next) => updateDraft(mapping.id, next, setDrafts)} disabled={controlsDisabled} />
									</TableCell>
									<TableCell>
										<Switch
											checked={draft.is_active}
											onCheckedChange={(checked) => updateDraft(mapping.id, { is_active: checked }, setDrafts)}
											disabled={controlsDisabled}
										/>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-1">
											<Button type="button" variant="ghost" size="icon" onClick={() => handleSave(mapping.id)} disabled={controlsDisabled}>
												<Save className="h-4 w-4" />
											</Button>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => handleDelete(mapping.id)}
												disabled={controlsDisabled}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>
		</div>
	);
}

function MappingForm({
	draft,
	onChange,
	disabled,
}: {
	draft: UserAgentMappingPayload;
	onChange: (next: UserAgentMappingPayload) => void;
	disabled?: boolean;
}) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<label className="text-sm font-medium">Pattern</label>
				<Input
					placeholder="User-Agent string or regex"
					value={draft.pattern}
					onChange={(event) => onChange({ ...draft, pattern: event.target.value })}
					disabled={disabled}
					data-testid="user-agent-mapping-pattern-input"
				/>
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">Match type</label>
				<MatchTypeSelect
					value={draft.match_type}
					onChange={(matchType) => onChange({ ...draft, match_type: matchType })}
					disabled={disabled}
				/>
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">App</label>
				<Input
					placeholder="App"
					value={draft.app}
					onChange={(event) => onChange({ ...draft, app: event.target.value })}
					disabled={disabled}
					data-testid="user-agent-mapping-app-input"
				/>
			</div>
			<div className="space-y-2">
				<label className="text-sm font-medium">Logo</label>
				<LogoInput draft={draft} onChange={onChange} disabled={disabled} />
			</div>
			<div className="flex items-center justify-between rounded-sm border p-3">
				<div>
					<p className="text-sm font-medium">Active</p>
					<p className="text-muted-foreground text-xs">Inactive mappings are saved but ignored by detection.</p>
				</div>
				<Switch checked={draft.is_active} onCheckedChange={(checked) => onChange({ ...draft, is_active: checked })} disabled={disabled} />
			</div>
		</div>
	);
}

function MatchTypeSelect({
	value,
	onChange,
	disabled,
}: {
	value: UserAgentMappingMatchType;
	onChange: (value: UserAgentMappingMatchType) => void;
	disabled?: boolean;
}) {
	return (
		<Select value={value} onValueChange={(next) => onChange(next as UserAgentMappingMatchType)} disabled={disabled}>
			<SelectTrigger className="w-full">
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{matchTypeOptions.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function LogoInput({
	draft,
	onChange,
	disabled,
}: {
	draft: UserAgentMappingPayload;
	onChange: (next: UserAgentMappingPayload) => void;
	disabled?: boolean;
}) {
	const dataUrl = draft.logo && draft.logo_mime ? `data:${draft.logo_mime};base64,${draft.logo}` : "";
	return (
		<div className="flex items-center gap-2">
			{dataUrl && <img src={dataUrl} alt="" className="size-7 rounded-sm border object-contain" />}
			<Button type="button" variant="outline" size="icon" disabled={disabled} asChild>
				<label>
					<Upload className="h-4 w-4" />
					<input
						type="file"
						accept="image/*"
						className="hidden"
						onChange={async (event) => {
							const file = event.target.files?.[0];
							if (!file) return;
							const logo = await fileToBase64(file);
							onChange({ ...draft, logo, logo_mime: file.type || "application/octet-stream" });
							event.target.value = "";
						}}
					/>
				</label>
			</Button>
			<Button
				type="button"
				variant="ghost"
				size="icon"
				disabled={disabled || !draft.logo}
				onClick={() => onChange({ ...draft, logo: undefined, logo_mime: null })}
			>
				<X className="h-4 w-4" />
			</Button>
		</div>
	);
}

function mappingToPayload(mapping: UserAgentMapping): UserAgentMappingPayload {
	return {
		pattern: mapping.pattern,
		match_type: mapping.match_type,
		app: mapping.app,
		logo: mapping.logo,
		logo_mime: mapping.logo_mime ?? null,
		is_active: mapping.is_active,
	};
}

function updateDraft(
	id: string,
	patch: Partial<UserAgentMappingPayload>,
	setDrafts: Dispatch<SetStateAction<Record<string, UserAgentMappingPayload>>>,
) {
	setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
}

function validateDraft(draft?: UserAgentMappingPayload): UserAgentMappingPayload | null {
	if (!draft || !draft.pattern.trim() || !draft.app.trim()) {
		toast.error("Pattern and app are required.");
		return null;
	}
	if (draft.match_type === "regex") {
		try {
			new RegExp(draft.pattern);
		} catch {
			toast.error("Regex pattern is invalid.");
			return null;
		}
	}
	return {
		...draft,
		pattern: draft.pattern.trim(),
		app: draft.app.trim(),
	};
}

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const value = String(reader.result ?? "");
			resolve(value.includes(",") ? value.split(",")[1] : value);
		};
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}