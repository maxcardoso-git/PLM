import { IsUUID, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PipelineRole } from '@prisma/client';

export class AssignPermissionDto {
  @ApiProperty({ description: 'ID do grupo de usuários' })
  @IsUUID('4')
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({ enum: PipelineRole, description: 'Papel do grupo no pipeline' })
  @IsEnum(PipelineRole)
  @IsNotEmpty()
  role: PipelineRole;
}

export class UpdatePermissionDto {
  @ApiProperty({ enum: PipelineRole, description: 'Novo papel do grupo no pipeline' })
  @IsEnum(PipelineRole)
  @IsNotEmpty()
  role: PipelineRole;
}

export class PermissionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  pipelineId: string;

  @ApiProperty()
  groupId: string;

  @ApiProperty({ enum: PipelineRole })
  role: PipelineRole;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  group?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export class UserPermissionDto {
  @ApiProperty()
  pipelineId: string;

  @ApiProperty({ enum: PipelineRole })
  role: PipelineRole;

  @ApiProperty()
  groupId: string;

  @ApiProperty()
  groupName: string;
}
