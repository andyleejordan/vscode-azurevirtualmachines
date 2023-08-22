/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { HybridComputeManagementClient, Machine } from "@azure/arm-hybridcompute";
import { getResourceGroupFromId } from "@microsoft/vscode-azext-azureutils";
import { IActionContext, ISubscriptionContext, callWithTelemetryAndErrorHandling } from "@microsoft/vscode-azext-utils";
import { AppResource, AppResourceResolver } from "@microsoft/vscode-azext-utils/hostapi";
import { ArcServerTreeItem, ResolvedArcServer } from "./tree/ArcServerTreeItem";
import { createHybridComputeClient } from "./utils/azureClients";

export class ArcServerResolver implements AppResourceResolver {

    // possibly pass down the full tree item, but for now try to get away with just the AppResource
    public async resolveResource(subContext: ISubscriptionContext, resource: AppResource): Promise<ResolvedArcServer | undefined> {
        return await callWithTelemetryAndErrorHandling('resolveResource', async (context: IActionContext) => {
            const client: HybridComputeManagementClient = await createHybridComputeClient([context, subContext]);
            const machine: Machine = await client.machines.get(getResourceGroupFromId(resource.id), resource.name, { expand: 'instanceView' });
            return new ArcServerTreeItem(subContext, { ...resource, ...machine });
        });
    }

    public matchesResource(resource: AppResource): boolean {
        return resource.type.toLowerCase() === 'microsoft.hybridcompute/machines';
    }
}
