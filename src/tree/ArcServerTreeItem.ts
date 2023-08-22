/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { HybridComputeManagementClient, Machine } from "@azure/arm-hybridcompute";
import { getResourceGroupFromId } from "@microsoft/vscode-azext-azureutils";
import { AzExtTreeItem, IActionContext, ISubscriptionContext, nonNullProp, nonNullValueAndProp } from '@microsoft/vscode-azext-utils';
import { ResolvedAppResourceBase, ResolvedAppResourceTreeItem } from '@microsoft/vscode-azext-utils/hostapi';
import { ViewPropertiesModel } from "@microsoft/vscode-azureresources-api";
import { createHybridComputeClient } from "../utils/azureClients";
import { treeUtils } from "../utils/treeUtils";

export interface ResolvedArcServer extends ResolvedAppResourceBase {
    data: Machine;
    resourceGroup: string;
    getFqdn(): string;
    label: string;
    name: string;
}

export type ResolvedArcServerTreeItem = ResolvedAppResourceTreeItem<ResolvedArcServer> & AzExtTreeItem;

export class ArcServerTreeItem implements ResolvedArcServer {
    public get label(): string {
        return `${this.name}`;
    }

    public get iconPath(): treeUtils.IThemedIconPath {
        // TODO: Add an ArcServer icon!
        return treeUtils.getThemedIconPath('Virtual-Machine');
    }

    public get id(): string {
        // https://github.com/microsoft/vscode-azurevirtualmachines/issues/70
        return nonNullProp(this.machine, 'id').toLowerCase();
    }

    public get name(): string {
        return nonNullProp(this.machine, 'name');
    }

    public get resourceGroup(): string {
        // https://github.com/microsoft/vscode-azurevirtualmachines/issues/70
        return getResourceGroupFromId(this.id).toLowerCase();
    }

    public get description(): string | undefined {
        return this._state?.toLowerCase() !== 'connected' ? this._state : undefined;
    }

    public get data(): Machine {
        return this.machine;
    }

    public get viewProperties(): ViewPropertiesModel {
        return {
            data: this.machine,
            label: this.name,
        }
    }

    public static linuxContextValue: string = 'linuxMachine';
    public static windowsContextValue: string = 'windowsMachine';

    public contextValuesToAdd?: string[] | undefined;

    private machine: Machine;
    private _state?: string;

    public constructor(private readonly _subscription: ISubscriptionContext, machine: Machine) {
        this.machine = machine;
        this._state = nonNullValueAndProp(machine.properties, 'status');
        // TODO: Maybe should be `machine.properties?.osProfile?.computerName`
        this.contextValuesToAdd = nonNullValueAndProp(machine.properties, 'osName').toLowerCase() === "linux" ? [ArcServerTreeItem.linuxContextValue] : [ArcServerTreeItem.windowsContextValue];
    }

    public getFqdn(): string {
        return nonNullValueAndProp(this.machine.properties, 'machineFqdn');
    }

    public async refreshImpl?(context: IActionContext): Promise<void> {
        try {
            this._state = await this.getState(context);
        } catch {
            this._state = undefined;
        }
    }

    private async getState(context: IActionContext): Promise<string | undefined> {
        const client: HybridComputeManagementClient = await createHybridComputeClient([context, this._subscription]);
        const machine: Machine = await client.machines.get(this.resourceGroup, this.name, { expand: 'instanceView' });
        return nonNullValueAndProp(machine.properties, 'status');
    }
}
